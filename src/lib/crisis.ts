// Словарь-страховка (слой 1 из спецификации, раздел 6). Срабатывает до LLM и без сети.
// high — прерывает сценарий полноэкранной плашкой; medium — мягкая плашка над подборкой.
export type CrisisType =
  | 'medical_emergency' | 'missing_child' | 'violence' | 'sexual_abuse'
  | 'self_harm_child' | 'suicidal_parent' | 'neglect' | 'other_danger'
export interface CrisisFlag { type: CrisisType; severity: 'high' | 'medium'; evidence: string }

const RULES: { type: CrisisType; severity: 'high' | 'medium'; re: RegExp }[] = [
  { type: 'suicidal_parent', severity: 'high', re: /(не хочу|не хочется) (больше )?жить|покончить с собой|жашагым келбейт|өлгүм келет/i },
  { type: 'self_harm_child', severity: 'high', re: /(реж|царапа)ет себя|(он|она|сын|дочь)[^.]{0,30}(не хочет жить|говорит о смерти)|өзүн кесет/i },
  { type: 'medical_emergency', severity: 'high', re: /судорог|не дышит|трудно дышать|задыха|потерял[аи]? сознание|отравил|кровотеч|подтека|(не|перестал[аи]?) шевел|кыймылдабай|талма|дем ала албай/i },
  { type: 'missing_child', severity: 'high', re: /(ребён(о|е)к|сын|дочь|дочка)[^.]{0,30}пропал|не выходит на связь|не могу найти (сына|дочь|ребёнка|ребенка)|жоголуп кетти|жоголду/i },
  { type: 'sexual_abuse', severity: 'high', re: /домога|сексуальн[а-яёөүңa-z]* насил|трогал[аи]? (его|её|ее) (там|за интим)|зордук/i },
  { type: 'violence', severity: 'medium', re: /(?<![а-яёөүңa-z])(бьёт|бьет|избивает|ударил[аи]?)(?![а-яёөүңa-z])|урат|сабайт|боюсь (сделать ему|причинить) (больно|вред)/i },
  { type: 'neglect', severity: 'medium', re: /оставля[а-яёөүңa-z]* (одн(ого|у)|без присмотра)|жалгыз калтыр/i },
  { type: 'suicidal_parent', severity: 'medium', re: /безнадёж|безнадеж|нет сил жить|ничего не хочу|үмүтсүз/i },
]

// Ложные триггеры (переносный смысл) — не флагуем, если нет других признаков.
const FALSE_POSITIVE = /убить готова|убить готов|убила бы за|чуть не умерла со смеху/i

export function scanCrisis(text: string): CrisisFlag[] {
  const flags: CrisisFlag[] = []
  const sentences = text.split(/(?<=[.!?\n])\s+/)
  for (const r of RULES) {
    const s = sentences.find(x => r.re.test(x) && !FALSE_POSITIVE.test(x))
    if (s && !flags.some(f => f.type === r.type)) {
      flags.push({ type: r.type, severity: r.severity, evidence: s.trim().split(/\s+/).slice(0, 20).join(' ') })
    }
  }
  return flags
}
