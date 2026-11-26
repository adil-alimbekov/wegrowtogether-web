import { useEffect, useState } from 'react'
import type { CrisisFlag } from '../lib/crisis'
import { useT } from '../lib/useT'
import { Numbers } from './Numbers'

const NUMS: Record<string, string[]> = {
  medical_emergency: ['103', '112'], missing_child: ['102', '112'], violence: ['102', '111'], sexual_abuse: ['102', '111'],
  self_harm_child: ['111', '103'], suicidal_parent: ['103', '112'], neglect: ['111', '112'], other_danger: ['112', '102'],
}

export function CrisisScreen({ flag, onContinue }: { flag: CrisisFlag; onContinue: () => void }) {
  const { t } = useT()
  const [s, setS] = useState(5)
  useEffect(() => { const id = setInterval(() => setS(x => Math.max(0, x - 1)), 1000); return () => clearInterval(id) }, [])
  const key = `crisis_${flag.type}` as keyof typeof t
  return (
    <div className="crisis" role="alertdialog" aria-labelledby="crisis-h">
      <div className="wrap narrow">
        <h1 id="crisis-h" className="sos-h" style={{ fontSize: 'clamp(30px,8vw,44px)' }}>{t.crisis_title}</h1>
        <p style={{ fontSize: 19, fontWeight: 500 }}>{t[key] as string}</p>
        <div className="quote">«{flag.evidence}»</div>
        <Numbers only={NUMS[flag.type]} />
        <a className="btn btn-ghost btn-block" href="#sos" onClick={onContinue}>{t.sos_open}</a>
        <button className="btn btn-soft btn-block" disabled={s > 0} onClick={onContinue}>
          {s > 0 ? t.crisis_wait.replace('{s}', String(s)) : t.crisis_cont}
        </button>
      </div>
    </div>
  )
}
