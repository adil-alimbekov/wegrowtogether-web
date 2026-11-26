import { useState } from 'react'
import { Flow } from '../components/Flow'
import { Radio, YMSelect } from '../components/YM'
import { ageInMonths, formatAge, isValidBirth, stageOf } from '../lib/age'
import { go } from '../lib/router'
import { removeChild, setState, uid, upsertChild, useStore } from '../lib/store'
import { useT } from '../lib/useT'

export function ChildForm({ id }: { id?: string }) {
  const { t, lang } = useT()
  const existing = useStore(s => s.children.find(c => c.id === id))
  const born = sessionStorage.getItem('wgt.born') === '1'
  const [name, setName] = useState(existing?.name ?? '')
  const [m, setM] = useState<number | ''>(existing?.birthMonth ?? '')
  const [y, setY] = useState<number | ''>(existing?.birthYear ?? '')
  const [sex, setSex] = useState<'male' | 'female' | 'none' | ''>(existing?.sex ?? '')
  const [traits, setTraits] = useState(existing?.traits ?? '')
  const [err, setErr] = useState(false)
  const ok = name.trim() && m && y && isValidBirth({ year: +y, month: +m })

  function save() {
    if (!ok) return setErr(true)
    upsertChild({ id: existing?.id ?? uid(), name: name.trim(), birthYear: +y, birthMonth: +m, sex: sex === 'male' || sex === 'female' ? sex : undefined, traits: traits.trim() || undefined })
    if (born) { sessionStorage.removeItem('wgt.born'); setState({ pregnancy: undefined }) }
    go('home')
  }
  return (
    <Flow step={1} total={1} back="home">
      <h1>{existing ? t.ch_title_edit : t.ch_title_new}</h1>
      {existing && y && m && <p className="lead">{formatAge(ageInMonths({ year: +y, month: +m }), lang)} · {t[`stage_${stageOf(ageInMonths({ year: +y, month: +m }))}`]}</p>}
      <div className="panel stack" style={{ marginTop: 20 }}>
        <label className="field"><span>{t.cf_name}</span>
          <input className="input" value={name} onChange={e => setName(e.target.value)} maxLength={30} autoFocus={!existing} />
          <span className="hint">{t.ch_name_hint}</span>
        </label>
        <div className="field"><span>{t.cf_birth}</span>
          <YMSelect idp="ch" month={m} year={y} onChange={(a, b) => { setM(a); setY(b) }} />
          <span className="hint">{t.ch_birth_hint}</span>
          {ok && <span className="agebadge" style={{ justifySelf: 'start' }}>{t.cf_age_is}: {formatAge(ageInMonths({ year: +y, month: +m }), lang)}</span>}
        </div>
        <div className="field"><span>{t.cf_sex}</span>
          <Radio name="sex" value={sex} onChange={setSex} options={[['female', t.cf_sex_f], ['male', t.cf_sex_m], ['none', t.cf_sex_n]]} />
        </div>
        <label className="field"><span>{t.ch_traits}</span>
          <textarea className="textarea" style={{ minHeight: 96 }} value={traits} onChange={e => setTraits(e.target.value)} placeholder={t.ch_traits_ph} maxLength={300} />
        </label>
        {err && !ok && <p className="err">{t.ch_err}</p>}
        <button className="btn btn-primary btn-block" onClick={save}>{t.ch_save}</button>
        {existing && <button className="link" style={{ color: 'var(--sos)' }} onClick={() => { removeChild(existing.id); go('home') }}>{t.home_delete}</button>}
      </div>
    </Flow>
  )
}

export function PregnancyForm() {
  const { t } = useT()
  const p = useStore(s => s.pregnancy)
  const [m, setM] = useState<number | ''>(p?.dueMonth ?? '')
  const [y, setY] = useState<number | ''>(p?.dueYear ?? '')
  const [first, setFirst] = useState<'yes' | 'no' | ''>(p?.firstChild == null ? '' : p.firstChild ? 'yes' : 'no')
  const [err, setErr] = useState(false)
  const ok = m && y && (p || true)
  function save() {
    if (!ok) return setErr(true)
    setState({ pregnancy: { dueMonth: +m, dueYear: +y, firstChild: first === '' ? undefined : first === 'yes' } })
    go('home')
  }
  return (
    <Flow step={1} total={1} back="home">
      <h1>{t.pg_title}</h1>
      <div className="panel stack" style={{ marginTop: 20 }}>
        <div className="field"><span>{t.pg_due}</span>
          <YMSelect idp="pg" future month={m} year={y} onChange={(a, b) => { setM(a); setY(b) }} />
          <span className="hint">{t.pg_hint}</span>
        </div>
        <div className="field"><span>{t.pg_first}</span>
          <Radio name="first" value={first} onChange={setFirst} options={[['yes', t.cf_yes], ['no', t.cf_no]]} />
        </div>
        {err && <p className="err">{t.pg_err}</p>}
        <button className="btn btn-primary btn-block" onClick={save}>{t.ch_save}</button>
        {p && <button className="link" style={{ color: 'var(--sos)' }} onClick={() => { setState({ pregnancy: undefined }); go('home') }}>{t.home_delete}</button>}
      </div>
    </Flow>
  )
}
