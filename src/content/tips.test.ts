import { describe, it, expect } from 'vitest'
import { rankTips, TIPS } from './tips'

describe('рекомендации', () => {
  it('главная боль идёт первой', () => {
    expect(rankTips({ concerns: ['homework'], stages: ['s7_12'] })[0].concern).toBe('homework')
  })
  it('только подходящий возраст', () => {
    expect(rankTips({ concerns: ['sleep'], stages: ['s12_18'] }).every(t => t.stages.includes('s12_18'))).toBe(true)
  })
  it('скрытые не показываются, сделанные опускаются', () => {
    const first = rankTips({ concerns: ['sleep'], stages: ['s3_7'] })[0]
    const hidden = rankTips({ concerns: ['sleep'], stages: ['s3_7'], feedback: { [first.id]: 'hide' } })
    expect(hidden.some(t => t.id === first.id)).toBe(false)
    const done = rankTips({ concerns: ['sleep'], stages: ['s3_7'], feedback: { [first.id]: 'done' } })
    expect(done.slice(0, 3).some(t => t.id === first.id)).toBe(false)
  })
  it('ребёнок и беременность оба в первых трёх, без трёх одинаковых болей', () => {
    const r = rankTips({ concerns: ['sleep', 'tantrums'], stages: ['s3_7', 'prenatal'] }).slice(0, 3)
    expect(r.some(t => t.stages.includes('prenatal'))).toBe(true)
    expect(new Set(r.map(t => t.concern)).size).toBeGreaterThan(1)
  })
  it('у каждой карточки есть RU и KG', () => {
    for (const t of TIPS) { expect(t.ru[0] && t.ru[1] && t.kg[0] && t.kg[1]).toBeTruthy() }
  })
})
