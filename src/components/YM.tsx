import { useT } from '../lib/useT'
import { nowYM } from '../lib/age'
// Выбор месяца и года без точной даты.
export function YMSelect({ month, year, onChange, future = false, idp }: { month: number | ''; year: number | ''; onChange: (m: number | '', y: number | '') => void; future?: boolean; idp: string }) {
  const { t } = useT()
  const now = nowYM()
  const years = future ? [now.year, now.year + 1] : Array.from({ length: 19 }, (_, i) => now.year - i)
  return (
    <div className="two">
      <label className="field"><span className="sr">{t.cf_month}</span>
        <select id={idp + '-m'} className="select" value={month} onChange={e => onChange(e.target.value ? +e.target.value : '', year)}>
          <option value="">{t.cf_month}</option>
          {t.months.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
        </select>
      </label>
      <label className="field"><span className="sr">{t.cf_year}</span>
        <select id={idp + '-y'} className="select" value={year} onChange={e => onChange(month, e.target.value ? +e.target.value : '')}>
          <option value="">{t.cf_year}</option>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </label>
    </div>
  )
}
export function Radio<T extends string>({ name, value, options, onChange }: { name: string; value: T | ''; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div className="radio-row" role="radiogroup">
      {options.map(([v, l]) => (
        <label key={v}><input type="radio" name={name} checked={value === v} onChange={() => onChange(v)} /><span>{l}</span></label>
      ))}
    </div>
  )
}
