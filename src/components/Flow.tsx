import type { ReactNode } from 'react'
import { IBack } from './icons'
import { useT } from '../lib/useT'
export function Flow({ step, total = 5, back, children }: { step: number; total?: number; back?: string; children: ReactNode }) {
  const { t } = useT()
  return (
    <main className="flow">
      <div className="wrap narrow">
        <div className="flow-top">
          {back !== undefined && <a className="back" href={'#' + back} aria-label={t.back}><IBack /></a>}
          <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={step}><i style={{ width: `${(step / total) * 100}%` }} /></div>
        </div>
        {children}
      </div>
    </main>
  )
}
