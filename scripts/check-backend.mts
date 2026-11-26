import { createClient } from '@supabase/supabase-js'
import { handleParse } from '../server/parse-handler'
const URL = process.env.SUPABASE_URL!, KEY = process.env.SUPABASE_ANON_KEY!
const MP = 'http://127.0.0.1:54324/api/v1'
async function login(email: string) {
  const c = createClient(URL, KEY, { auth: { persistSession: false } })
  await fetch(`${MP}/messages`, { method: 'DELETE' })
  await c.auth.signInWithOtp({ email })
  let code = ''
  for (let i = 0; i < 20 && !code; i++) { await new Promise(r => setTimeout(r, 400)); const r = await (await fetch(`${MP}/search?query=${encodeURIComponent('to:' + email)}`)).json(); if (r.messages?.length) { const m = await (await fetch(`${MP}/message/${r.messages[0].ID}`)).json(); code = (m.Text.match(/\b(\d{6})\b/) || [])[1] ?? '' } }
  const { data, error } = await c.auth.verifyOtp({ email, token: code, type: 'email' }); if (error) throw error
  return { c, token: data.session!.access_token, id: data.user!.id }
}
const a = process.argv[2]
const A = await login(a)
const B = await login(`other${Date.now()}@example.com`)
const fidB = (await B.c.rpc('ensure_family')).data
const ch = await B.c.from('children').select('*')
const prof = await B.c.from('profiles').select('*')
const ins = await B.c.from('children').insert({ family_id: (await A.c.rpc('ensure_family')).data, display_name: 'X', birth_year: 2020, birth_month: 1 })
console.log('B sees children:', ch.data?.length, 'profiles:', prof.data?.length, 'B insert into A family blocked:', !!ins.error, 'fidB', !!fidB)
const anon = createClient(URL, KEY, { auth: { persistSession: false } })
console.log('anon sees children:', (await anon.from('children').select('*')).data?.length ?? 'err')
// parse handler: A has consent E, B does not
const fake = async () => ({ children: [], pregnancy: null, main_concerns: [{ text: 't', category: 'sleep' as const }], weekday_min: { value: null, confidence: 0 }, weekend_min: { value: null, confidence: 0 }, screen_time_min: { value: null, confidence: 0 }, caregivers: [], goals: [], crisis_flags: [], missing_questions: [] })
process.env.ANTHROPIC_API_KEY = 'test'
const req = (tok: string, text: string) => new Request('http://x/api/parse', { method: 'POST', headers: { authorization: `Bearer ${tok}` }, body: JSON.stringify({ text, mode: 'child' }) })
const rA = await handleParse(req(A.token, 'У малыша судороги прямо сейчас'), { parse: fake })
const jA = await rA.json()
console.log('A parse', rA.status, 'crisis from dictionary merged:', jA.result?.crisis_flags?.[0]?.type)
const rB = await handleParse(req(B.token, 'текст'), { parse: fake })
console.log('B without consent E:', rB.status)
const rX = await handleParse(req('bad', 'текст'), { parse: fake })
console.log('bad token:', rX.status)
// delete account
const del = await B.c.rpc('delete_my_account')
console.log('delete B:', del.error?.message ?? 'ok')
