// Состояние онбординга между экранами (в sessionStorage, чтобы пережить перезагрузку).
import type { ParseResult } from './parser'
export interface Draft { text: string; result?: ParseResult; crisisSeen?: boolean }
const K = 'wgt.draft'
export function getDraft(): Draft { try { return JSON.parse(sessionStorage.getItem(K) || '') } catch { return { text: '' } } }
export function setDraft(d: Draft) { try { sessionStorage.setItem(K, JSON.stringify(d)) } catch { /* ignore */ } }
export function clearDraft() { try { sessionStorage.removeItem(K) } catch { /* ignore */ } }
