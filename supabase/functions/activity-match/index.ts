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
    const response = await fetch('https://api.openai.com/v1/responses', { method: 'POST', headers: { 'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`, 'Content-Type': 'application/json' }, body: JSON.stringify({
      model: 'gpt-5.6-luna', reasoning: { effort: 'none' }, max_output_tokens: 180, store: false,
      instructions: 'Recommend at most 3 activities from the supplied real list. Never invent an activity. Be concise and friendly.',
      input: `Participant request: ${prompt}\nReal activities: ${JSON.stringify(activities ?? [])}`,
    }) })
    if (!response.ok) throw new Error('AI service unavailable')
    const json = await response.json()
    const recommendation = json.output?.flatMap((item: {content?: {type:string,text?:string}[]}) => item.content ?? []).find((part: {type:string}) => part.type === 'output_text')?.text ?? 'No match found.'
    return Response.json({ recommendation, remaining }, { headers: { ...cors, 'Content-Type': 'application/json' } })
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : 'Unexpected error' }, { status: 500, headers: cors }) }
})
