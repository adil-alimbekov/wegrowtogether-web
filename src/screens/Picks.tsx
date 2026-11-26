import { useMemo, useState } from 'react'
import { Flow } from '../components/Flow'
import { TipCards } from '../components/TipCards'
import { getDraft } from '../lib/onboarding'
import { parseStory } from '../lib/parser'
import { setState, useStore } from '../lib/store'
import { completeness } from '../lib/family'
import { useT } from '../lib/useT'

export function Picks() {
  const { t } = useT()
  const s = useStore(x => x)
  const medium = useMemo(() => getDraft().result?.crisis_flags.some(f => f.severity === 'medium'), [])
  const [ans, setAns] = useState('')
  const pct = completeness(s)
  const later = s.profile.snoozedUntil && new Date(s.profile.snoozedUntil) > new Date()
  const q = !later ? s.profile.missing[0] : undefined

  function answer() {
    if (!q || !ans.trim()) return
    const r = parseStory(ans, s.status ?? 'child')
    setState(st => ({
      profile: {
        ...st.profile,
        weekdayMin: st.profile.weekdayMin ?? r.weekday_min.value ?? undefined,
        weekendMin: st.profile.weekendMin ?? r.weekend_min.value ?? undefined,
        screenMin: st.profile.screenMin ?? r.screen_time_min.value ?? undefined,
        caregivers: [...new Set([...st.profile.caregivers, ...r.caregivers])],
        goals: q === 'Q7' || q === 'P5' ? [...st.profile.goals, ans.trim()] : st.profile.goals,
        missing: st.profile.missing.filter(x => x !== q),
      },
      children: q === 'Q3' && st.children[0] ? st.children.map((c, i) => (i === 0 ? { ...c, traits: ans.trim() } : c)) : st.children,
    }))
    setAns('')
  }
  const snooze = () => setState(st => ({ profile: { ...st.profile, snoozedUntil: new Date(Date.now() + 3 * 864e5).toISOString() } }))

  return (
    <Flow step={5}>
      <h1>{t.picks_title}</h1>
      <p className="lead">{t.picks_lead}</p>
      <div className="stack" style={{ marginTop: 20 }}>
        {medium && (
          <div className="soft-banner" role="note">
            <b style={{ fontFamily: 'var(--head)', fontSize: 18 }}>{t.medium_title}</b>
            <p className="small" style={{ color: 'var(--ink)' }}>{t.medium_text}</p>
            <a className="link" href="#sos" style={{ justifySelf: 'start', paddingLeft: 0 }}>{t.sos_open}</a>
          </div>
        )}
        <TipCards one />
        <p className="disc">{t.footer_disclaimer}</p>
        <section className="panel stack" style={{ gap: 10 }}>
          <div className="row" style={{ justifyContent: 'space-between' }}><b>{t.picks_profile.replace('{p}', String(pct))}</b></div>
          <div className="meter"><i style={{ width: pct + '%' }} /></div>
          {q && (
            <div className="stack" style={{ gap: 10, marginTop: 8 }}>
              <p style={{ fontWeight: 500 }}>{t.q[q][0]}</p>
              <input className="input" value={ans} onChange={e => setAns(e.target.value)} placeholder={t.q[q][1].replace(/[«»]/g, '')} />
              <div className="row">
                <button className="btn btn-primary btn-sm" onClick={answer} disabled={!ans.trim()}>{t.picks_more}</button>
                <button className="btn btn-soft btn-sm" onClick={snooze}>{t.picks_later}</button>
              </div>
            </div>
          )}
        </section>
        <a className="btn btn-ghost btn-block" href="#home">{t.picks_home}</a>
      </div>
    </Flow>
  )
}
