-- =============================================================
-- DIAGNOSTIC & FIX SCRIPT
-- Run this in the Supabase SQL Editor
-- =============================================================

-- 1. CHECK: What's in activity_members?
SELECT 
  am.activity_id,
  am.user_id,
  a.title,
  p.display_name
FROM public.activity_members am
JOIN public.activities a ON a.id = am.activity_id
LEFT JOIN public.profiles p ON p.id = am.user_id;

-- 2. CHECK: What's in shad_wishes?
SELECT 
  sw.id,
  sw.prompt,
  sw.created_at,
  p.display_name
FROM public.shad_wishes sw
LEFT JOIN public.profiles p ON p.id = sw.user_id
ORDER BY sw.created_at DESC;

-- 3. FIX: Drop and recreate activity_members policies to be more permissive for staff
DROP POLICY IF EXISTS "users join themselves" ON public.activity_members;
CREATE POLICY "users join themselves" ON public.activity_members 
  FOR INSERT TO authenticated 
  WITH CHECK (user_id = auth.uid() OR (SELECT public.is_staff()));

-- 4. FIX: Make sure staff can also insert into activity_members (for QR check-in)
DROP POLICY IF EXISTS "staff manages members" ON public.activity_members;
CREATE POLICY "staff manages members" ON public.activity_members 
  FOR UPDATE TO authenticated 
  USING ((SELECT public.is_staff()));

-- 5. FIX: Ensure activity creators can auto-join their own activities
-- (creator_id matches auth.uid() at creation time)
DROP POLICY IF EXISTS "creators can join own activity" ON public.activity_members;
CREATE POLICY "creators can join own activity" ON public.activity_members
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.activities 
      WHERE id = activity_id AND creator_id = auth.uid()
    )
  );

-- 6. CHECK: Verify the activity "Playing Soccer" has an activity_member row
SELECT 
  a.title, 
  a.creator_id, 
  a.ends_at,
  a.ends_at < now() AS is_expired,
  COUNT(am.user_id) AS member_count
FROM public.activities a
LEFT JOIN public.activity_members am ON am.activity_id = a.id
GROUP BY a.id, a.title, a.creator_id, a.ends_at;

-- 7. FIX: Manually insert creator into activity_members if missing
INSERT INTO public.activity_members (activity_id, user_id)
SELECT a.id, a.creator_id
FROM public.activities a
WHERE NOT EXISTS (
  SELECT 1 FROM public.activity_members am 
  WHERE am.activity_id = a.id AND am.user_id = a.creator_id
)
ON CONFLICT DO NOTHING;

-- 8. NOTIFY PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';

-- 9. Verify fix worked
SELECT 
  a.title,
  p.display_name AS creator,
  a.ends_at,
  a.ends_at < now() AS is_expired
FROM public.activities a
JOIN public.activity_members am ON am.activity_id = a.id AND am.user_id = a.creator_id
JOIN public.profiles p ON p.id = a.creator_id;
