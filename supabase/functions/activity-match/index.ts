import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type' }
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const auth = req.headers.get('Authorization') ?? ''
    const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } })
    const { data: remaining, error: quotaError } = await db.rpc('consume_ai_quota')
    if (quotaError) return Response.json({ error: quotaError.message }, { status: 429, headers: cors })
    const { prompt } = await req.json()
    if (typeof prompt !== 'string' || prompt.trim().length < 3 || prompt.length > 300) return Response.json({ error: 'Prompt must be 3–300 characters.' }, { status: 400, headers: cors })
    const { data: activities } = await db.from('activities').select('id,title,description,category,starts_at,ends_at,location,capacity').gte('ends_at', new Date().toISOString()).limit(30)
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', { method: 'POST', headers: { 'Authorization': `Bearer ${Deno.env.get('GROQ_API_KEY')}`, 'Content-Type': 'application/json' }, body: JSON.stringify({
      model: 'llama-3.1-8b-instant', max_completion_tokens: 180, temperature: 0.2,
      messages: [
        { role: 'system', content: 'Recommend at most 3 activities from the supplied real list. Never invent an activity. Be concise and friendly.' },
        { role: 'user', content: `Participant request: ${prompt}\nReal activities: ${JSON.stringify(activities ?? [])}` },
      ],
    }) })
    if (!response.ok) throw new Error('AI service unavailable')
    const json = await response.json()
    const recommendation = json.choices?.[0]?.message?.content ?? 'No match found.'
    return Response.json({ recommendation, remaining }, { headers: { ...cors, 'Content-Type': 'application/json' } })
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : 'Unexpected error' }, { status: 500, headers: cors }) }
})
