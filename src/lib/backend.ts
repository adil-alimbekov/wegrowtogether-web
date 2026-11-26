// Связь с сервером (Supabase). Если переменные окружения не заданы, сайт работает
// в демо-режиме: всё хранится только в браузере, как раньше.
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { getState, onChange, resetAll, setState, type Child, type Consent, type State } from './store'
import type { ParseResult } from './parser'
import type { CrisisFlag } from './crisis'

const URL_ = import.meta.env.VITE_SUPABASE_URL as string | undefined
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
export const sb: SupabaseClient | null = URL_ && KEY ? createClient(URL_, KEY, { auth: { persistSession: true, autoRefreshToken: true } }) : null
export const LIVE = !!sb
export const PHONE_AUTH = import.meta.env.VITE_PHONE_AUTH === '1'
const API = (import.meta.env.VITE_API_BASE as string | undefined) ?? ''

let familyId: string | null = null
let syncing = false // не отправлять обратно то, что только что загрузили

export type Contact = { method: 'email' | 'phone'; value: string }
const normPhone = (p: string) => '+' + p.replace(/\D/g, '')

export async function sendCode(c: Contact) {
  if (!sb) return
  const { error } = c.method === 'email'
    ? await sb.auth.signInWithOtp({ email: c.value.trim(), options: { shouldCreateUser: true } })
    : await sb.auth.signInWithOtp({ phone: normPhone(c.value), options: { shouldCreateUser: true } })
  if (error) throw error
}

export async function verifyCode(c: Contact, code: string) {
  if (!sb) return
  const { error } = c.method === 'email'
    ? await sb.auth.verifyOtp({ email: c.value.trim(), token: code, type: 'email' })
    : await sb.auth.verifyOtp({ phone: normPhone(c.value), token: code, type: 'sms' })
  if (error) throw error
  await pullAll()
}

/** Загружает всё про семью с сервера в локальное состояние. */
export async function pullAll() {
  if (!sb) return
  const { data: u } = await sb.auth.getUser()
  if (!u.user) return
  const { data: fid, error } = await sb.rpc('ensure_family')
  if (error) throw error
  familyId = fid as string
  const [p, ch, pg, cs, fb] = await Promise.all([
    sb.from('profiles').select('*').eq('user_id', u.user.id).single(),
    sb.from('children').select('*').eq('family_id', familyId).order('created_at'),
    sb.from('pregnancies').select('*').eq('family_id', familyId).maybeSingle(),
    sb.from('consents').select('*').order('given_at'),
    sb.from('tip_feedback').select('tip_id,kind'),
  ])
  const prof = p.data
  syncing = true
  setState(s => ({
    live: true,
    user: { name: prof?.display_name ?? s.user?.name ?? '', contact: u.user!.email ?? u.user!.phone ?? '', method: u.user!.email ? 'email' : 'phone', createdAt: u.user!.created_at },
    lang: prof?.lang ?? s.lang,
    status: prof?.status ?? undefined,
    onboarded: !!prof?.onboarded,
    children: (ch.data ?? []).map(c => ({ id: c.id, name: c.display_name, birthYear: c.birth_year, birthMonth: c.birth_month, sex: c.sex ?? undefined, traits: c.traits ?? undefined })),
    pregnancy: pg.data ? { dueYear: pg.data.due_year, dueMonth: pg.data.due_month, firstChild: pg.data.first_child ?? undefined } : undefined,
    consents: mergeConsents((cs.data ?? []).map(c => ({ type: c.type, version: c.version, lang: c.lang, at: c.given_at, withdrawnAt: c.withdrawn_at ?? undefined })), s.consents),
    profile: {
      concerns: prof?.concerns ?? [], caregivers: prof?.caregivers ?? [], goals: prof?.goals ?? [], missing: prof?.missing ?? [],
      weekdayMin: prof?.weekday_min ?? undefined, weekendMin: prof?.weekend_min ?? undefined, screenMin: prof?.screen_min ?? undefined,
      snoozedUntil: prof?.snoozed_until ?? undefined,
    },
    feedback: Object.fromEntries((fb.data ?? []).map(f => [f.tip_id, f.kind])),
  }))
  syncing = false
}

// Согласие A (cookies) живёт в браузере до входа, остальные — на сервере.
function mergeConsents(server: Consent[], local: Consent[]) {
  const out = [...server]
  for (const c of local) if (c.type === 'A' && !out.some(x => x.type === 'A')) out.push(c)
  return out
}

/** Согласия, данные до входа (галочки на экране регистрации), записываются на сервер после входа. */
export async function pushConsents(list: Consent[]) {
  if (!sb) return
  const { data: u } = await sb.auth.getUser()
  if (!u.user || !list.length) return
  const { error } = await sb.from('consents').insert(list.map(c => ({ user_id: u.user!.id, type: c.type, version: c.version, lang: c.lang })))
  if (error) throw error
}

export async function deleteAccount() {
  if (sb) {
    const { error } = await sb.rpc('delete_my_account')
    if (error) throw error
    await sb.auth.signOut()
  }
  familyId = null
  resetAll()
}

export async function signOut() {
  if (sb) await sb.auth.signOut()
  familyId = null
  resetAll()
}

export async function logCrisis(flags: CrisisFlag[]) {
  if (!sb || !flags.length) return
  const { data: u } = await sb.auth.getUser()
  if (!u.user) return
  // Только тип и время, без цитаты (спецификация, раздел 6).
  await sb.from('crisis_events').insert(flags.map(f => ({ user_id: u.user!.id, flag: f.type, severity: f.severity })))
}

/** Разбор рассказа на сервере (Claude). Возвращает null, если сервер недоступен — тогда работает локальный разбор. */
export async function parseRemote(text: string, mode: State['status']): Promise<ParseResult | null> {
  if (!sb) return null
  const { data } = await sb.auth.getSession()
  const token = data.session?.access_token
  if (!token) return null
  const ctrl = new AbortController(); const timer = setTimeout(() => ctrl.abort(), 12_000)
  try {
    const r = await fetch(`${API}/api/parse`, { method: 'POST', signal: ctrl.signal, headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: JSON.stringify({ text, mode }) })
    if (!r.ok) return null
    const j = await r.json()
    return j.result as ParseResult
  } catch { return null } finally { clearTimeout(timer) }
}

// ——— синхронизация изменений ———
const childRow = (c: Child) => ({ id: c.id, family_id: familyId, display_name: c.name, birth_year: c.birthYear, birth_month: c.birthMonth, sex: c.sex ?? null, traits: c.traits ?? null })
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)
export const syncErrors = { last: '' }

async function push(prev: State, next: State) {
  if (!sb || !next.live || !familyId) return
  const uid = (await sb.auth.getUser()).data.user?.id
  if (!uid) return
  const ops: PromiseLike<{ error: unknown }>[] = []
  if (prev.user?.name !== next.user?.name || prev.lang !== next.lang || prev.status !== next.status || prev.onboarded !== next.onboarded || !same(prev.profile, next.profile)) {
    const p = next.profile
    ops.push(sb.from('profiles').update({
      display_name: next.user?.name ?? null, lang: next.lang, status: next.status ?? null, onboarded: next.onboarded,
      concerns: p.concerns, caregivers: p.caregivers, goals: p.goals, missing: p.missing,
      weekday_min: p.weekdayMin ?? null, weekend_min: p.weekendMin ?? null, screen_min: p.screenMin ?? null, snoozed_until: p.snoozedUntil ?? null,
    }).eq('user_id', uid))
  }
  if (!same(prev.children, next.children)) {
    const changed = next.children.filter(c => !same(c, prev.children.find(x => x.id === c.id)))
    const removed = prev.children.filter(c => !next.children.some(x => x.id === c.id)).map(c => c.id)
    if (changed.length) ops.push(sb.from('children').upsert(changed.map(childRow)))
    if (removed.length) ops.push(sb.from('children').delete().in('id', removed))
  }
  if (!same(prev.pregnancy, next.pregnancy)) {
    ops.push(next.pregnancy
      ? sb.from('pregnancies').upsert({ family_id: familyId, due_year: next.pregnancy.dueYear, due_month: next.pregnancy.dueMonth, first_child: next.pregnancy.firstChild ?? null })
      : sb.from('pregnancies').delete().eq('family_id', familyId))
  }
  if (!same(prev.consents, next.consents)) {
    for (const c of next.consents) {
      if (c.type === 'A') continue
      const old = prev.consents.find(x => x.type === c.type && x.at === c.at)
      if (!old) ops.push(sb.from('consents').insert({ user_id: uid, type: c.type, version: c.version, lang: c.lang }))
      else if (c.withdrawnAt && !old.withdrawnAt) ops.push(sb.from('consents').update({ withdrawn_at: c.withdrawnAt }).eq('user_id', uid).eq('type', c.type).is('withdrawn_at', null))
    }
  }
  if (!same(prev.feedback, next.feedback)) {
    for (const [id, kind] of Object.entries(next.feedback)) if (prev.feedback[id] !== kind) ops.push(sb.from('tip_feedback').upsert({ user_id: uid, tip_id: id, kind }))
    const gone = Object.keys(prev.feedback).filter(id => !(id in next.feedback))
    if (gone.length) ops.push(sb.from('tip_feedback').delete().eq('user_id', uid).in('tip_id', gone))
  }
  const res = await Promise.all(ops)
  const err = res.find(r => r.error)?.error as { message?: string } | undefined
  if (err) { syncErrors.last = err.message ?? 'sync error'; console.error('sync', err) }
}

let queue = Promise.resolve()
export function startSync() {
  if (!sb) return
  onChange((prev, next) => {
    if (syncing) return // это данные, только что пришедшие с сервера
    queue = queue.then(() => push(prev, next)).catch(e => console.error(e))
  })
  sb.auth.getSession().then(({ data }) => { if (data.session) pullAll().catch(e => console.error(e)) })
}
export const waitSync = () => queue
export { getState }
