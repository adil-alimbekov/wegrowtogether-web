// Хранилище демо-версии: localStorage в браузере пользователя.
// Интерфейс повторяет таблицы из спецификации (users, children, parent_profiles, consents),
// чтобы потом заменить реализацию на Supabase без переписывания экранов.
import { useSyncExternalStore } from 'react'
import type { Lang } from './age'
import type { Concern } from './parser'

export type ConsentType = 'A' | 'B' | 'C' | 'D' | 'E'
export interface Consent { type: ConsentType; version: string; lang: Lang; at: string; withdrawnAt?: string }
export interface Child { id: string; name: string; birthYear: number; birthMonth: number; sex?: 'male' | 'female'; traits?: string }
export interface Pregnancy { dueYear: number; dueMonth: number; firstChild?: boolean }
export type FamilyStatus = 'child' | 'expecting' | 'both'

export interface State {
  lang: Lang
  theme: 'auto' | 'light' | 'dark'
  cookies?: { analytics: boolean; at: string }
  user?: { name: string; contact: string; method: 'phone' | 'email'; createdAt: string }
  consents: Consent[]
  status?: FamilyStatus
  children: Child[]
  pregnancy?: Pregnancy
  profile: { concerns: { text: string; category: Concern }[]; weekdayMin?: number; weekendMin?: number; screenMin?: number; caregivers: string[]; goals: string[]; missing: string[]; snoozedUntil?: string }
  onboarded: boolean
  feedback: Record<string, 'useful' | 'done' | 'hide'>
  live?: boolean // вошёл через сервер (Supabase)
}

const KEY = 'wgt.v1'
const CONSENT_VERSION = '2026-11-draft'

function browserLang(): Lang {
  try { return /^(ky|kg)/i.test(navigator.language) ? 'kg' : 'ru' } catch { return 'ru' }
}
const initial = (): State => ({ lang: browserLang(), theme: 'auto', consents: [], children: [], profile: { concerns: [], caregivers: [], goals: [], missing: [] }, onboarded: false, feedback: {} })

function load(): State {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return { ...initial(), ...JSON.parse(raw) }
  } catch { /* хранилище недоступно — работаем в памяти */ }
  return initial()
}

let state = load()
const subs = new Set<() => void>()
type Change = (prev: State, next: State) => void
const changeSubs = new Set<Change>()
/** Подписка на изменения с прошлым и новым состоянием (для синхронизации с сервером). */
export function onChange(f: Change) { changeSubs.add(f); return () => { changeSubs.delete(f) } }
function save() { try { localStorage.setItem(KEY, JSON.stringify(state)) } catch { /* ignore */ } }

export function setState(patch: Partial<State> | ((s: State) => Partial<State>)) {
  const p = typeof patch === 'function' ? patch(state) : patch
  const prev = state
  state = { ...state, ...p }
  save(); subs.forEach(f => f()); changeSubs.forEach(f => f(prev, state))
}
export function getState() { return state }
export function useStore<T>(sel: (s: State) => T): T {
  return useSyncExternalStore(cb => { subs.add(cb); return () => { subs.delete(cb) } }, () => sel(state))
}

export function giveConsent(type: ConsentType) {
  setState(s => ({ consents: [...s.consents.filter(c => c.type !== type), { type, version: CONSENT_VERSION, lang: s.lang, at: new Date().toISOString() }] }))
}
export function withdrawConsent(type: ConsentType) {
  setState(s => ({ consents: s.consents.map(c => (c.type === type && !c.withdrawnAt ? { ...c, withdrawnAt: new Date().toISOString() } : c)) }))
}
export const hasConsent = (s: State, t: ConsentType) => s.consents.some(c => c.type === t && !c.withdrawnAt)

export const uid = (): string => {
  try { return crypto.randomUUID() } catch { return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, c => (+c ^ (Math.random() * 16) >> (+c / 4)).toString(16)) }
}
export function upsertChild(c: Child) {
  setState(s => ({ children: s.children.some(x => x.id === c.id) ? s.children.map(x => (x.id === c.id ? c : x)) : [...s.children, c] }))
}
export function removeChild(id: string) { setState(s => ({ children: s.children.filter(c => c.id !== id) })) }
export function resetAll() {
  const keep = { lang: state.lang, theme: state.theme, cookies: state.cookies }
  state = { ...initial(), ...keep }; save(); subs.forEach(f => f())
}
export function setFeedback(id: string, kind: 'useful' | 'done' | 'hide' | null) {
  setState(s => { const fb = { ...s.feedback }; if (kind) fb[id] = kind; else delete fb[id]; return { feedback: fb } })
}
