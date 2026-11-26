// Тема: авто = системная + «мягкий вечерний режим» 21:00–07:00.
import type { State } from './store'
export function resolveTheme(t: State['theme'], d = new Date()): 'light' | 'dark' {
  if (t !== 'auto') return t
  const h = d.getHours()
  const evening = h >= 21 || h < 7
  let sys = false
  try { sys = matchMedia('(prefers-color-scheme: dark)').matches } catch { /* ignore */ }
  return sys || evening ? 'dark' : 'light'
}
export function applyTheme(t: State['theme']) {
  const r = resolveTheme(t)
  document.documentElement.dataset.theme = r
  document.querySelector('meta[name=theme-color]:not([media])')?.remove()
  const m = document.createElement('meta'); m.name = 'theme-color'; m.content = r === 'dark' ? '#151419' : '#FAF7F2'
  document.head.appendChild(m)
}
