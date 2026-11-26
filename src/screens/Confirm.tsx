import { useMemo, useState } from 'react'
import { Flow } from '../components/Flow'
import { Radio, YMSelect } from '../components/YM'
import { IPlus } from '../components/icons'
import { ageInMonths, formatAge, isValidBirth, isValidDue, nowYM } from '../lib/age'
import { getDraft, setDraft } from '../lib/onboarding'
import type { Concern } from '../lib/parser'
import { go } from '../lib/router'
import { setState, uid, useStore } from '../lib/store'
import { useT } from '../lib/useT'

interface EChild { id: string; traits?: string; name: string; nameLow: boolean; month: number | ''; year: number | ''; dateLow: boolean; sex: 'male' | 'female' | 'none' | ''; stated?: string }
const CATS: Concern[] = ['sleep', 'tantrums', 'screens', 'homework', 'teen', 'rules', 'food', 'other']
const PCATS: Concern[] = ['fears', 'birth_prep', 'other']

export function Confirm() {
  const { t, lang } = useT()
  const status = useStore(s => s.status) ?? 'child'
  const draft = useMemo(getDraft, [])
  const r = draft.result
  const now = nowYM()
  const needKids = status !== 'expecting'
  const needPreg = status !== 'child'

  const [kids, setKids] = useState<EChild[]>(() => {
    const list = (r?.children ?? []).map<EChild>((c, idx) => {
      const st = c.age_stated.value
      let year: number | '' = c.birth_year.value ?? '', month: number | '' = c.birth_month.value ?? ''
      if (!year && st) year = st.unit === 'years' ? now.year - st.value : Math.floor((now.year * 12 + now.month - 1 - st.value) / 12)
      return {
        id: uid(), name: c.display_name.value ?? '', nameLow: c.display_name.confidence < 0.7,
        month, year, dateLow: !c.birth_year.value || !c.birth_month.value || c.birth_year.confidence < 0.7,
        sex: c.sex.value ?? '', traits: (r as { traits?: (string | null)[] } | undefined)?.traits?.[idx] ?? undefined, stated: st ? (st.unit === 'years' ? formatAge(st.value * 12, lang) : formatAge(st.value, lang)) : undefined,
      }
    })
    return needKids && !list.length ? [{ id: uid(), name: '', nameLow: true, month: '', year: '', dateLow: true, sex: '' }] : list
  })
  const pre = sessionStorage.getItem('wgt.pre') as Concern | null
  const [concern, setConcern] = useState<Concern | ''>(r?.main_concerns[0]?.category ?? pre ?? '')
  const [concernText] = useState(r?.main_concerns[0]?.text ?? '')
  const due = r?.pregnancy?.due
  const [dm, setDm] = useState<number | ''>(due?.value?.month ?? '')
  const [dy, setDy] = useState<number | ''>(due?.value?.year ?? '')
  const [first, setFirst] = useState<'yes' | 'no' | ''>(r?.pregnancy?.first_child.value == null ? '' : r.pregnancy.first_child.value ? 'yes' : 'no')
  const [wd, setWd] = useState(r?.weekday_min.value ?? '')
  const [we, setWe] = useState(r?.weekend_min.value ?? '')
  const [scr, setScr] = useState(r?.screen_time_min.value ?? '')
  const [tried, setTried] = useState(false)

  const upd = (id: string, p: Partial<EChild>) => setKids(k => k.map(c => (c.id === id ? { ...c, ...p } : c)))
  const kidOk = (c: EChild) => c.name.trim() && c.month && c.year && isValidBirth({ year: +c.year, month: +c.month })
  const dueOk = !needPreg || (dm && dy && isValidDue({ year: +dy, month: +dm }))
  const valid = (!needKids || (kids.length > 0 && kids.every(kidOk))) && dueOk && concern

  function save() {
    setTried(true)
    if (!valid) return
    const cats = [concern as Concern, ...(r?.main_concerns.slice(1).map(c => c.category) ?? [])]
    setState(s => ({
      children: needKids ? kids.map(c => ({ id: c.id, name: c.name.trim(), birthYear: +c.year, birthMonth: +c.month, sex: c.sex === 'male' || c.sex === 'female' ? c.sex : undefined, traits: c.traits })) : s.children,
      pregnancy: needPreg ? { dueYear: +dy, dueMonth: +dm, firstChild: first === '' ? undefined : first === 'yes' } : s.pregnancy,
      profile: {
        concerns: [...new Set(cats)].map((c, i) => ({ category: c, text: i === 0 && c === r?.main_concerns[0]?.category ? concernText : '' })),
        weekdayMin: wd === '' ? undefined : +wd, weekendMin: we === '' ? undefined : +we, screenMin: scr === '' ? undefined : +scr,
        caregivers: r?.caregivers ?? [], goals: r?.goals ?? [], missing: (r?.missing_questions ?? []).filter(q => !['Q1', 'Q2', 'P1', 'P2'].includes(q)),
      },
      onboarded: true,
    }))
    setDraft({ ...draft })
    sessionStorage.removeItem('wgt.pre')
    go('picks')
  }

  const Check = ({ on }: { on: boolean }) => (on ? <span className="conf-tag">{t.cf_check}</span> : null)

  return (
    <Flow step={4} back="story">
      <h1>{t.cf_title}</h1>
      <p className="lead">{t.cf_lead}</p>
      <div className="stack" style={{ marginTop: 20 }}>
        {needKids && kids.map((c, i) => {
          const ok = c.month && c.year && isValidBirth({ year: +c.year, month: +c.month })
          return (
            <section className="panel stack" key={c.id} aria-label={t.cf_child}>
              <div className="child-h">
                <h3>{t.cf_child}{kids.length > 1 ? ` ${i + 1}` : ''}</h3>
                {kids.length > 1 && <button className="link" onClick={() => setKids(k => k.filter(x => x.id !== c.id))}>{t.cf_remove}</button>}
              </div>
              {!r?.children.length && i === 0 && <p className="note warm">{t.cf_missing_q1}</p>}
              <label className="field"><span>{t.cf_name}<Check on={c.nameLow && !!c.name} /></span>
                <input className="input" value={c.name} onChange={e => upd(c.id, { name: e.target.value, nameLow: false })} maxLength={30} />
              </label>
              <div className="field"><span>{t.cf_birth}<Check on={c.dateLow && !!c.year} /></span>
                <YMSelect idp={c.id} month={c.month} year={c.year} onChange={(m, y) => upd(c.id, { month: m, year: y, dateLow: false })} />
                {c.stated && c.dateLow && <span className="hint">{t.cf_age_stated.replace('{age}', c.stated)}</span>}
                {ok && <span className="agebadge" style={{ justifySelf: 'start' }}>{t.cf_age_is}: {formatAge(ageInMonths({ year: +c.year, month: +c.month }), lang)}</span>}
                {tried && !kidOk(c) && <span className="err">{t.ch_err}</span>}
              </div>
              <div className="field"><span>{t.cf_sex}</span>
                <Radio name={'sex' + c.id} value={c.sex} onChange={v => upd(c.id, { sex: v })} options={[['female', t.cf_sex_f], ['male', t.cf_sex_m], ['none', t.cf_sex_n]]} />
              </div>
            </section>
          )
        })}
        {needKids && <button className="btn btn-soft" onClick={() => setKids(k => [...k, { id: uid(), name: '', nameLow: false, month: '', year: '', dateLow: false, sex: '' }])}><IPlus />{t.cf_add_child}</button>}

        {needPreg && (
          <section className="panel stack">
            <h3>{t.cf_due}<Check on={!!due && due.confidence < 0.8 && !!dm} /></h3>
            <YMSelect idp="due" future month={dm} year={dy} onChange={(m, y) => { setDm(m); setDy(y) }} />
            <span className="hint">{t.pg_hint}</span>
            {tried && !dueOk && <span className="err">{t.pg_err}</span>}
            <div className="field"><span>{t.cf_first}</span>
              <Radio name="first" value={first} onChange={setFirst} options={[['yes', t.cf_yes], ['no', t.cf_no]]} />
            </div>
          </section>
        )}

        <section className="panel stack">
          <h3>{r?.main_concerns.length ? t.cf_concern : t.cf_missing_q2}</h3>
          {concernText && <p className="small">«{concernText}»</p>}
          <div className="chips" style={{ marginTop: 0 }}>
            {(status === 'expecting' ? PCATS : status === 'both' ? [...CATS.slice(0, 7), ...PCATS] : CATS).map(c => (
              <button key={c} className="chip" aria-pressed={concern === c} onClick={() => setConcern(c)}>{t[`c_${c}`]}</button>
            ))}
          </div>
          {tried && !concern && <span className="err">{t.cf_missing_q2}</span>}
        </section>

        {needKids && (
          <section className="panel stack">
            <h3>{t.cf_time}</h3>
            <div className="two" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <label className="field"><span className="hint">{t.cf_weekday}</span><input className="input" inputMode="numeric" value={wd} onChange={e => setWd(e.target.value.replace(/\D/g, '').slice(0, 4))} /></label>
              <label className="field"><span className="hint">{t.cf_weekend}</span><input className="input" inputMode="numeric" value={we} onChange={e => setWe(e.target.value.replace(/\D/g, '').slice(0, 4))} /></label>
            </div>
            <label className="field"><span className="hint">{t.cf_screen}</span><input className="input" inputMode="numeric" value={scr} onChange={e => setScr(e.target.value.replace(/\D/g, '').slice(0, 4))} /></label>
          </section>
        )}

        <button className="btn btn-primary btn-block" onClick={save} aria-disabled={!valid}>{t.cf_save}</button>
      </div>
    </Flow>
  )
}
