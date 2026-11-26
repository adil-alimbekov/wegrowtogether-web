import { describe, it, expect } from 'vitest'
import { ageInMonths, formatAge, stageOf, pregnancyInfo } from './age'

describe('age', () => {
  it('counts months', () => {
    expect(ageInMonths({ year: 2021, month: 3 }, { year: 2026, month: 11 })).toBe(68)
  })
  it('formats RU plurals', () => {
    expect(formatAge(27, 'ru')).toBe('2 года 3 месяца')
    expect(formatAge(12, 'ru')).toBe('1 год')
    expect(formatAge(60 + 11, 'ru')).toBe('5 лет 11 месяцев')
    expect(formatAge(21 * 12 + 1, 'ru')).toBe('21 год 1 месяц')
    expect(formatAge(5, 'ru')).toBe('5 месяцев')
  })
  it('formats KG', () => {
    expect(formatAge(27, 'kg')).toBe('2 жаш 3 ай')
    expect(formatAge(5, 'kg')).toBe('5 ай')
  })
  it('stages', () => {
    expect(stageOf(-2)).toBe('prenatal'); expect(stageOf(35)).toBe('s0_3'); expect(stageOf(36)).toBe('s3_7')
    expect(stageOf(150)).toBe('s12_18')
  })
  it('pregnancy', () => {
    const p = pregnancyInfo({ year: 2027, month: 4 }, { year: 2026, month: 11 })
    expect(p.monthsLeft).toBe(5); expect(p.trimester).toBe(2)
  })
})
