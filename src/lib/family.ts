import { ageInMonths, stageOf, type Stage } from './age'
import type { State } from './store'
export const AVA = ['var(--coral)', 'var(--sage)', 'var(--sky)', 'var(--lilac)', '#F2C46D']
export function mainStage(s: State): Stage {
  const c = s.children[0]
  if (c) return stageOf(ageInMonths({ year: c.birthYear, month: c.birthMonth }))
  return s.pregnancy ? 'prenatal' : 's3_7'
}
export function completeness(s: State): number {
  const total = (s.status === 'expecting' ? 5 : 7) + (s.status === 'both' ? 2 : 0)
  return Math.round(((total - s.profile.missing.length) / total) * 100)
}
