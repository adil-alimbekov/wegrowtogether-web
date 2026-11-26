// POST /api/parse — разбор рассказа. Проверяет вход и согласие E, затем вызывает Claude.
// Любая ошибка возвращает 503, и браузер переходит на локальный разбор.
import { createClient } from '@supabase/supabase-js'
import { parseWithClaude, PROMPT_VERSION } from './llm.js'
import { scanCrisis } from '../src/lib/crisis.js'

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

export async function handleParse(req: Request, deps = { parse: parseWithClaude }): Promise<Response> {
  const url = process.env.SUPABASE_URL, anon = process.env.SUPABASE_ANON_KEY
  if (!url || !anon) return json({ error: 'not_configured' }, 503)
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) return json({ error: 'unauthorized' }, 401)
  const sb = createClient(url, anon, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } })
  const { data: u, error: ue } = await sb.auth.getUser(token)
  if (ue || !u.user) return json({ error: 'unauthorized' }, 401)

  let body: { text?: unknown; mode?: unknown }
  try { body = await req.json() } catch { return json({ error: 'bad_json' }, 400) }
  const text = typeof body.text === 'string' ? body.text.trim().slice(0, 6000) : ''
  const mode = body.mode === 'expecting' || body.mode === 'both' ? body.mode : 'child'
  if (text.length < 3) return json({ error: 'empty' }, 400)

  // Согласие E обязательно: без него текст не уходит во внешний сервис.
  const { data: cons } = await sb.from('consents').select('type').eq('type', 'E').is('withdrawn_at', null).limit(1)
  if (!cons?.length) return json({ error: 'no_consent_E' }, 403)

  // Простое ограничение: не больше 20 разборов в час на пользователя.
  const since = new Date(Date.now() - 3600_000).toISOString()
  const { count } = await sb.from('onboarding_sessions').select('id', { count: 'exact', head: true }).gte('created_at', since)
  if ((count ?? 0) >= 20) return json({ error: 'rate_limited' }, 429)

  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) return json({ error: 'llm_not_configured' }, 503)
  const ctrl = new AbortController(); const timer = setTimeout(() => ctrl.abort(), 20_000)
  try {
    const result = await deps.parse(text, mode, new Date().toISOString().slice(0, 10), ctrl.signal)
    // Слой 1 — словарь-страховка: его флаги добавляются, даже если модель их не поставила.
    for (const f of scanCrisis(text)) if (!result.crisis_flags.some(x => x.type === f.type)) result.crisis_flags.push(f)
    await sb.from('onboarding_sessions').insert({ user_id: u.user.id, transcript: text, parsed: result, parser: 'claude', prompt_version: PROMPT_VERSION })
    return json({ result, parser: 'claude' })
  } catch (e) {
    console.error('parse failed', e instanceof Error ? e.message : e)
    return json({ error: 'llm_failed' }, 503)
  } finally { clearTimeout(timer) }
}
