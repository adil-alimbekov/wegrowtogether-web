// Локальный парсер рассказа (демо-слой). В продакшене его заменит LLM со structured output
// по JSON-схеме из спецификации, а этот модуль останется как запасной путь при сбое/таймауте.
import { scanCrisis, type CrisisFlag } from './crisis'
import { nowYM, type YM } from './age'

export interface Field<T> { value: T | null; confidence: number; quote?: string }
export type Concern = 'sleep' | 'tantrums' | 'screens' | 'homework' | 'teen' | 'rules' | 'food' | 'fears' | 'birth_prep' | 'other'

export interface ParsedChild {
  display_name: Field<string>; birth_year: Field<number>; birth_month: Field<number>
  sex: Field<'male' | 'female'>; age_stated: Field<{ value: number; unit: 'years' | 'months' }>
}
export interface ParseResult {
  children: ParsedChild[]
  pregnancy: { due: Field<YM>; first_child: Field<boolean> } | null
  main_concerns: { text: string; category: Concern }[]
  weekday_min: Field<number>; weekend_min: Field<number>; screen_time_min: Field<number>
  caregivers: string[]; goals: string[]
  crisis_flags: CrisisFlag[]; missing_questions: string[]
}

const MONTHS: [RegExp, number][] = [
  [/январ/i, 1], [/феврал/i, 2], [/март/i, 3], [/апрел/i, 4], [/ма[йяе](?![а-яёөүңa-z])|мае(?![а-яёөүңa-z])/i, 5], [/июн/i, 6],
  [/июл/i, 7], [/август/i, 8], [/сентябр/i, 9], [/октябр/i, 10], [/ноябр/i, 11], [/декабр/i, 12],
]
const NUM: Record<string, number> = {
  один: 1, одного: 1, два: 2, двух: 2, три: 3, трёх: 3, трех: 3, четыре: 4, пять: 5, шесть: 6, семь: 7,
  восемь: 8, девять: 9, десять: 10, одиннадцать: 11, двенадцать: 12, тринадцать: 13, четырнадцать: 14,
  пятнадцать: 15, шестнадцать: 16, семнадцать: 17, сорок: 40, тридцать: 30, двадцать: 20,
  бир: 1, эки: 2, үч: 3, төрт: 4, беш: 5, алты: 6, жети: 7, сегиз: 8, тогуз: 9, он: 10, кырк: 40, отуз: 30,
}
const NUMW = Object.keys(NUM).join('|')
const num = (s: string) => (/^\d+$/.test(s) ? parseInt(s, 10) : NUM[s.toLowerCase()] ?? NaN)

const STOP = new Set(['Я', 'Мы', 'Он', 'Она', 'Ему', 'Ей', 'Это', 'Сейчас', 'Перед', 'Вижу', 'Если', 'Когда', 'Живём', 'Живем', 'Бабушка', 'Дедушка', 'Муж', 'Мама', 'Папа', 'Сыну', 'Дочке', 'Дочери', 'Сын', 'Дочь', 'Его', 'Её', 'Ее', 'В', 'А', 'И', 'Но', 'Ждём', 'Ждем', 'Мен', 'Биз', 'Ал', 'Уулум', 'Кызым'])

function findName(sent: string): Field<string> {
  const cues = [
    /(?:зовут|имя|называем|аты)\s+([А-ЯЁӨҮҢ][а-яёөүң-]+)/,
    /(?:сыну|сына|сын|дочке|дочери|дочь|дочка|уулум|кызым|сынок|малыш[ау]?)\s*,?\s+([А-ЯЁӨҮҢ][а-яёөүң-]+)/,
    /^\s*([А-ЯЁӨҮҢ][а-яёөүң-]+)\s*,?\s*(?:родил|\d|ему|ей|ей\s|туулган)/,
    /([А-ЯЁӨҮҢ][а-яёөүң-]+)\s*,?\s*(?:родился|родилась|туулган)/,
  ]
  const low = sent.trim().replace(/^[А-ЯЁ]/, c => c.toLowerCase())
  for (const re of cues) {
    const m = (re === cues[2] || re === cues[3] ? sent.trim() : low).match(re)
    if (m && !STOP.has(m[1])) {
      let name = m[1], conf = 0.9
      // «Сыну Эрмеку» → «Эрмек»: снимаем окончание дательного падежа, просим проверить.
      if (/^(сыну|сынку)/i.test(m[0]) && /[бвгджзклмнпрстфхцчшщ]у$/i.test(name)) { name = name.slice(0, -1); conf = 0.8 }
      else if (/^(дочке|дочери)/i.test(m[0]) && /е$/i.test(name)) conf = 0.65
      return { value: name, confidence: conf, quote: m[0].trim() }
    }
  }
  return { value: null, confidence: 0 }
}

function findBirth(sent: string, now: YM) {
  const r = { year: { value: null, confidence: 0 } as Field<number>, month: { value: null, confidence: 0 } as Field<number> }
  const y = sent.match(/(?<!\d)(19[89]\d|20[0-4]\d)(?!\d)/)
  if (y) r.year = { value: +y[1], confidence: 0.95, quote: y[0] }
  else {
    const short = sent.match(/(?<!\d)(\d{2})-?(го|жылы)(?![а-яёөүңa-z])/)
    if (short) r.year = { value: 2000 + +short[1], confidence: 0.7, quote: short[0] }
  }
  for (const [re, n] of MONTHS) if (re.test(sent) && /родил|туул|\d{4}|года|жыл/i.test(sent)) { r.month = { value: n, confidence: 0.9 }; break }
  if (r.year.value && r.year.value > now.year) r.year = { value: null, confidence: 0 }
  return r
}

function findAgeStated(sent: string): Field<{ value: number; unit: 'years' | 'months' }> {
  if (/полтор/i.test(sent)) return { value: { value: 18, unit: 'months' }, confidence: 0.9, quote: 'полтора' }
  let m = sent.match(new RegExp(`(\\d+|${NUMW})\\s*(год|года|лет|годик[а-яёөүңa-z]*|жаш)`, 'i'))
  if (m && !/\d{4}/.test(m[1])) return { value: { value: num(m[1]), unit: 'years' }, confidence: 0.9, quote: m[0] }
  m = sent.match(new RegExp(`(\\d+|${NUMW})\\s*(месяц[а-яёөүңa-z]*|ай(?![а-яёөүңa-z])|айлык)`, 'i'))
  if (m && /(ему|ей|малыш|сын|доч|бала|уул|кыз)/i.test(sent)) return { value: { value: num(m[1]), unit: 'months' }, confidence: 0.85, quote: m[0] }
  return { value: null, confidence: 0 }
}

function findSex(sent: string): Field<'male' | 'female'> {
  if (/(?<![а-яёөүңa-z])(сын[а-яёөүңa-z]*|мальчик[а-яёөүңa-z]*|родился|уул[а-яёөүңa-z]*)(?![а-яёөүңa-z])/i.test(sent)) return { value: 'male', confidence: 0.9 }
  if (/(?<![а-яёөүңa-z])(доч[а-яёөүңa-z]*|девочк[а-яёөүңa-z]*|родилась|кыз[а-яёөүңa-z]*)(?![а-яёөүңa-z])/i.test(sent)) return { value: 'female', confidence: 0.9 }
  return { value: null, confidence: 0 }
}

const CONCERNS: [Concern, RegExp][] = [
  ['sleep', /сон|спит|спать|уснуть|засыпа|уклад|перед сном|ночью просып|уктаб|уйку|уйкта/i],
  ['tantrums', /истерик|каприз|крич|орёт|орет|злится|тартын|ыйла/i],
  ['screens', /планшет|телефон|гаджет|мульт|ютуб|youtube|тикток|игр[ыа] на|экран|сыналгы/i],
  ['homework', /урок|домашн|дз|учёб|учеб|школ[а-яёөүңa-z]* оценк|сабак/i],
  ['teen', /подрост|замкнул|закрыл[а-яёөүңa-z]* в себе|не разговаривает|грубит|өспүрүм|туюк/i],
  ['rules', /правил|спорим|наказ|границ|не слушает|не слушается|тил албай/i],
  ['food', /не ест|еда|кормить|питани|тамак/i],
  ['fears', /боюсь род|страшно|тревож|коркуп|кооптон/i],
  ['birth_prep', /купить|сумк[а-яёөүңa-z]* в роддом|подготов|как папе|даярдан/i],
]

function findMinutes(s: string): number | null {
  if (/полдня|жарым күн/i.test(s)) return 240
  if (/весь день|бүт күн/i.test(s)) return 480
  if (/почти не вижу|почти не бываю/i.test(s)) return 15
  let m = s.match(new RegExp(`(\\d+|${NUMW})\\s*(час[а-яёөүңa-z]*|саат)`, 'i'))
  if (m) return num(m[1]) * 60
  m = s.match(new RegExp(`час[а-яёөүңa-z]*\\s+(${NUMW}|\\d+)`, 'i'))
  if (m) return num(m[1]) * 60
  if (/часик|час(?![а-яёөүңa-z])|саат(?![а-яёөүңa-z])/i.test(s)) return 60
  m = s.match(new RegExp(`(\\d+|${NUMW})\\s*(минут[а-яёөүңa-z]*|мүнөт)|минут\\s*(\\d+|${NUMW})`, 'i'))
  if (m) return num(m[1] ?? m[3])
  return null
}

const CAREGIVERS: [string, RegExp][] = [
  ['grandmother', /бабушк|чоң апа|апам кара/i], ['grandfather', /дедушк|чоң ата/i],
  ['partner', /муж(?![а-яёөүңa-z])|мужем|жена|женой|жолдош|папа|атасы/i], ['nanny', /нян|бала багуучу/i],
]

export function parseStory(text: string, mode: 'child' | 'expecting' | 'both', now: YM = nowYM()): ParseResult {
  const sentences = text.split(/(?<=[.!?\n;])\s+/).filter(Boolean)
  const res: ParseResult = {
    children: [], pregnancy: null, main_concerns: [], caregivers: [], goals: [],
    weekday_min: { value: null, confidence: 0 }, weekend_min: { value: null, confidence: 0 },
    screen_time_min: { value: null, confidence: 0 }, crisis_flags: scanCrisis(text), missing_questions: [],
  }

  if (mode !== 'expecting') {
    // Одно предложение (или его начало) с именем — один ребёнок.
    for (const s of sentences) {
      const name = findName(s)
      const isPregSent = /жд[ёе]м|күтүп|беремен|недел/i.test(s)
      if (!name.value && res.children.length) continue
      if (!name.value && !findAgeStated(s).value && !/родил|туул/i.test(s)) continue
      if (isPregSent && !name.value) continue
      const b = findBirth(s, now)
      const child: ParsedChild = { display_name: name, birth_year: b.year, birth_month: b.month, sex: findSex(s), age_stated: findAgeStated(s) }
      if (b.year.value) child.age_stated = { value: null, confidence: 0 }
      res.children.push(child)
    }
  }

  if (mode !== 'child') {
    const s = sentences.find(x => /жд[ёе]м|ожида|күтүп|ПДР|недел|төрөл/i.test(x)) ?? ''
    let due: Field<YM> = { value: null, confidence: 0 }
    const wk = s.match(/(\d{1,2})\s*(-?я|-?ая)?\s*(недел|жума)/i)
    if (wk) {
      const monthsLeft = Math.round((40 - +wk[1]) / 4.35)
      const total = now.year * 12 + now.month - 1 + monthsLeft
      due = { value: { year: Math.floor(total / 12), month: (total % 12) + 1 }, confidence: 0.75, quote: wk[0] }
    } else {
      for (const [re, n] of MONTHS) if (re.test(s)) {
        const y = s.match(/(?<!\d)(20[2-4]\d)(?!\d)/)
        const year = y ? +y[1] : n >= now.month ? now.year : now.year + 1
        due = { value: { year, month: n }, confidence: y ? 0.9 : 0.75, quote: s.trim() }
        break
      }
    }
    const first = /перв|тунгуч/i.test(text) ? { value: true, confidence: 0.85 } : /втор|третий|экинчи/i.test(text) ? { value: false, confidence: 0.85 } : { value: null, confidence: 0 }
    res.pregnancy = { due, first_child: first }
  }

  for (const [cat, re] of CONCERNS) {
    const s = sentences.find(x => re.test(x))
    if (s && res.main_concerns.length < 3) res.main_concerns.push({ text: s.trim().replace(/[.!]+$/, ''), category: cat })
  }

  for (const s of sentences) {
    const isScreen = /планшет|телефон|мульт|экран|сыналгы|ютуб/i.test(s)
    const isTogether = /вижу|провож|с ним|с ней|вместе|вечером|менен|бирге/i.test(s)
    const m = findMinutes(s)
    if (m == null) continue
    if (isScreen && res.screen_time_min.value == null) res.screen_time_min = { value: m, confidence: 0.8, quote: s.trim() }
    else if (isTogether || /будн|выходн|дем алыш|иш күн/i.test(s)) {
      const parts = s.split(/,|а в выходн|в выходн|дем алыш/i)
      if (/выходн|дем алыш/i.test(s) && parts.length > 1) {
        const wd = findMinutes(parts[0]); const we = findMinutes(parts.slice(1).join(' '))
        if (wd != null) res.weekday_min = { value: wd, confidence: 0.85, quote: s.trim() }
        if (we != null) res.weekend_min = { value: we, confidence: 0.85, quote: s.trim() }
      } else if (res.weekday_min.value == null) res.weekday_min = { value: m, confidence: m === 15 ? 0.5 : 0.85, quote: s.trim() }
    }
  }

  for (const [c, re] of CAREGIVERS) if (re.test(text)) res.caregivers.push(c)
  const goal = sentences.find(x => /чтобы|хочу,? чтобы|стало лучше|болсо|жакшы бол/i.test(x))
  if (goal) res.goals.push(goal.trim())

  // Отвеченным считается вопрос, где основное поле уверенно ≥ 0.6
  const ok = (f: Field<unknown>) => f.value != null && f.confidence >= 0.6
  const answered = new Set<string>()
  if (mode !== 'expecting') {
    if (res.children.some(c => ok(c.display_name) && (ok(c.birth_year) || ok(c.age_stated)))) answered.add('Q1')
    if (res.main_concerns.length) answered.add('Q2')
    if (/любит|нравится|характер|активн|спокойн|стеснит|злится|жакшы көрөт|мүнөз/i.test(text)) answered.add('Q3')
    if (ok(res.weekday_min) || ok(res.weekend_min)) answered.add('Q4')
    if (res.caregivers.length) answered.add('Q5')
    if (ok(res.screen_time_min)) answered.add('Q6')
    if (res.goals.length) answered.add('Q7')
    for (const q of ['Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6', 'Q7']) if (!answered.has(q)) res.missing_questions.push(q)
  }
  if (mode !== 'child' && res.pregnancy) {
    if (ok(res.pregnancy.due)) answered.add('P1')
    if (res.main_concerns.length) answered.add('P2')
    if (res.caregivers.length) answered.add('P3')
    if (/чувству|сил|устал|отдых|күчүм|чарча/i.test(text)) answered.add('P4')
    if (res.goals.length || /успеть|узнать|үлгүр/i.test(text)) answered.add('P5')
    for (const q of ['P1', 'P2', 'P3', 'P4', 'P5']) if (!answered.has(q)) res.missing_questions.push(q)
  }
  return res
}
