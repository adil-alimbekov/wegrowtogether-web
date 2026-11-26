// Возраст считается на лету из года и месяца рождения (точная дата не хранится).
export type Lang = 'ru' | 'kg'

export interface YM { year: number; month: number } // month: 1–12

export function nowYM(d = new Date()): YM {
  return { year: d.getFullYear(), month: d.getMonth() + 1 }
}

export function ageInMonths(birth: YM, now: YM = nowYM()): number {
  return (now.year - birth.year) * 12 + (now.month - birth.month)
}

function ruPlural(n: number, one: string, few: string, many: string) {
  const m10 = n % 10, m100 = n % 100
  if (m10 === 1 && m100 !== 11) return one
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few
  return many
}

export function formatAge(months: number, lang: Lang): string {
  if (months < 0) return lang === 'ru' ? 'ещё не родился' : 'али төрөлө элек'
  const y = Math.floor(months / 12), m = months % 12
  if (lang === 'kg') {
    if (y === 0) return months === 0 ? '1 айга жетпеген' : `${m} ай`
    return m ? `${y} жаш ${m} ай` : `${y} жаш`
  }
  if (y === 0) return months === 0 ? 'меньше месяца' : `${m} ${ruPlural(m, 'месяц', 'месяца', 'месяцев')}`
  const ys = `${y} ${ruPlural(y, 'год', 'года', 'лет')}`
  return m ? `${ys} ${m} ${ruPlural(m, 'месяц', 'месяца', 'месяцев')}` : ys
}

// Этапы из концепции: до рождения, 0–3, 3–7, 7–12, 12–18.
export type Stage = 'prenatal' | 's0_3' | 's3_7' | 's7_12' | 's12_18' | 'adult'
export function stageOf(months: number): Stage {
  if (months < 0) return 'prenatal'
  if (months < 36) return 's0_3'
  if (months < 84) return 's3_7'
  if (months < 144) return 's7_12'
  if (months < 216) return 's12_18'
  return 'adult'
}

// Беременность: храним только месяц и год ПДР. Неделя — грубая оценка (±2 недели).
export function pregnancyInfo(due: YM, now: YM = nowYM()) {
  const monthsLeft = ageInMonths(now, due) // сколько месяцев до ПДР
  const approxWeek = Math.max(1, Math.min(42, Math.round(40 - monthsLeft * 4.35)))
  const trimester = approxWeek <= 13 ? 1 : approxWeek <= 27 ? 2 : 3
  return { monthsLeft, approxWeek, trimester, overdue: monthsLeft < 0 }
}

export function isValidBirth(b: YM, now: YM = nowYM()) {
  const a = ageInMonths(b, now)
  return b.month >= 1 && b.month <= 12 && a >= 0 && a <= 18 * 12 + 11
}
export function isValidDue(d: YM, now: YM = nowYM()) {
  const left = ageInMonths(now, d)
  return d.month >= 1 && d.month <= 12 && left >= -1 && left <= 10
}
