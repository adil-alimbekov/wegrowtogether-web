import { useState } from 'react'
import { giveConsent, setState, useStore } from '../lib/store'
import { useT } from '../lib/useT'

export function CookieBanner() {
  const { t } = useT()
  const cookies = useStore(s => s.cookies)
  const [cfg, setCfg] = useState(false)
  const [analytics, setAnalytics] = useState(false)
  if (cookies) return null
  const done = (a: boolean) => { setState({ cookies: { analytics: a, at: new Date().toISOString() } }); giveConsent('A') }
  return (
    <div className="cookie" role="dialog" aria-label="Cookies">
      <p>{t.cookie_text}</p>
      {cfg && (
        <div>
          <div className="toggle"><span>{t.cookie_required_l}</span><input type="checkbox" checked disabled /></div>
          <label className="toggle"><span>{t.cookie_analytics}</span><input type="checkbox" checked={analytics} onChange={e => setAnalytics(e.target.checked)} /></label>
        </div>
      )}
      <div className="acts">
        {cfg
          ? <button className="btn btn-primary cfg" onClick={() => done(analytics)}>{t.cookie_save}</button>
          : <>
              <button className="btn btn-primary" onClick={() => done(true)}>{t.cookie_all}</button>
              <button className="btn btn-ghost" onClick={() => done(false)}>{t.cookie_req}</button>
              <button className="link cfg" onClick={() => setCfg(true)}>{t.cookie_cfg}</button>
            </>}
      </div>
    </div>
  )
}
