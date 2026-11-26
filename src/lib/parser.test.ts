import { describe, it, expect } from 'vitest'
import { parseStory } from './parser'
import { scanCrisis } from './crisis'
const now = { year: 2026, month: 11 }

describe('parser — пример из спецификации', () => {
  const r = parseStory('Сыну Эрмеку четыре года, с ним бабушка днём. Перед сном каждый день истерика, я уже не знаю, что делать. Вижу его только вечером минут сорок.', 'child', now)
  it('ребёнок', () => {
    expect(r.children[0].display_name.value).toBe('Эрмек')
    expect(r.children[0].sex.value).toBe('male')
    expect(r.children[0].age_stated.value).toEqual({ value: 4, unit: 'years' })
  })
  it('боль, время, помощники', () => {
    expect(r.main_concerns[0].category).toBe('sleep')
    expect(r.weekday_min.value).toBe(40)
    expect(r.caregivers).toContain('grandmother')
    expect(r.crisis_flags).toEqual([])
    expect(r.missing_questions).toEqual(expect.arrayContaining(['Q3', 'Q6', 'Q7']))
  })
})

describe('parser — год и месяц', () => {
  it('Айсулу, родилась в марте 2021', () => {
    const r = parseStory('Айсулу, родилась в марте 2021-го. Не хочет делать уроки.', 'child', now)
    expect(r.children[0].display_name.value).toBe('Айсулу')
    expect(r.children[0].birth_year.value).toBe(2021)
    expect(r.children[0].birth_month.value).toBe(3)
    expect(r.children[0].sex.value).toBe('female')
    expect(r.main_concerns[0].category).toBe('homework')
  })
  it('ждём в апреле, первый', () => {
    const r = parseStory('Ждём в апреле, первый. Боюсь родов.', 'expecting', now)
    expect(r.pregnancy?.due.value).toEqual({ year: 2027, month: 4 })
    expect(r.pregnancy?.first_child.value).toBe(true)
    expect(r.main_concerns[0].category).toBe('fears')
  })
  it('экранное время', () => {
    const r = parseStory('Дочке Алие 5 лет. Часа два мультиков на планшете каждый день.', 'child', now)
    expect(r.screen_time_min.value).toBe(120)
  })
})

describe('crisis', () => {
  it('high', () => {
    expect(scanCrisis('Я больше не хочу жить')[0]).toMatchObject({ type: 'suicidal_parent', severity: 'high' })
    expect(scanCrisis('У малыша судороги')[0].type).toBe('medical_emergency')
    expect(scanCrisis('Балам жоголду')[0].type).toBe('missing_child')
  })
  it('ложные триггеры', () => {
    expect(scanCrisis('Убить готова за разбросанные игрушки')).toEqual([])
  })
})
