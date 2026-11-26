import type { ReactElement } from 'react'
import { Flow } from '../components/Flow'
import { IBelly, IBoth, IKid, INext } from '../components/icons'
import { setState, type FamilyStatus } from '../lib/store'
import { useT } from '../lib/useT'
import { go } from '../lib/router'

export function Status() {
  const { t } = useT()
  const opts: { v: FamilyStatus; ic: ReactElement; bg: string; title: string; sub: string }[] = [
    { v: 'child', ic: <IKid />, bg: 'var(--coral-soft)', title: t.st_child, sub: t.st_child_sub },
    { v: 'expecting', ic: <IBelly />, bg: 'var(--lilac-soft)', title: t.st_expecting, sub: t.st_expecting_sub },
    { v: 'both', ic: <IBoth />, bg: 'var(--sage-soft)', title: t.st_both, sub: t.st_both_sub },
  ]
  return (
    <Flow step={2} back="register">
      <h1>{t.st_title}</h1>
      <p className="lead">{t.st_lead}</p>
      <div className="cards" style={{ marginTop: 22 }}>
        {opts.map(o => (
          <button key={o.v} className="pick" onClick={() => { setState({ status: o.v }); go('story') }}>
            <span className="ic" style={{ background: o.bg }}>{o.ic}</span>
            <span><b>{o.title}</b><span>{o.sub}</span></span>
            <INext />
          </button>
        ))}
      </div>
    </Flow>
  )
}
