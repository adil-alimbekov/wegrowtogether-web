import { useState } from 'react'
import { Heart } from '../components/Logo'
import { Numbers } from '../components/Numbers'
import { ICheck, IClock } from '../components/icons'
import { type Stage } from '../lib/age'
import { pickTips } from '../content/tips'
import type { Concern } from '../lib/parser'
import { useT } from '../lib/useT'
import { go } from '../lib/router'
import { useStore } from '../lib/store'
import { LIVE } from '../lib/backend'

const STAGES: { s: Stage; c: string }[] = [
  { s: 'prenatal', c: 'var(--lilac)' }, { s: 's0_3', c: 'var(--coral)' }, { s: 's3_7', c: '#F2C46D' },
  { s: 's7_12', c: 'var(--sage)' }, { s: 's12_18', c: 'var(--sky)' },
]
const PAINS: Concern[] = ['sleep', 'tantrums', 'screens', 'homework', 'teen', 'rules']
export const STAGE_CONCERN: Record<Stage, Concern> = { prenatal: 'birth_prep', s0_3: 'sleep', s3_7: 'tantrums', s7_12: 'homework', s12_18: 'teen', adult: 'other' }

export function startWith(concern?: Concern) {
  if (concern) sessionStorage.setItem('wgt.pre', concern)
  go('register')
}

export function Landing() {
  const { t, lang } = useT()
  const user = useStore(s => s.user)
  const [stage, setStage] = useState<Stage>('s3_7')
  const tip = pickTips([STAGE_CONCERN[stage]], stage, 1)[0]
  const start = () => (user ? go('status') : startWith())
  return (
    <main>
      <section className="hero">
        <div className="wrap hero-grid">
          <div>
            <h1><span className="in" style={{ ["--d" as string]: "0ms" }}>{t.hero_title_1}</span><span className="accent in" style={{ ["--d" as string]: "120ms" }}>{t.hero_title_2}</span></h1>
            <p className="lead in" style={{ ["--d" as string]: "240ms" }}>{t.hero_lead}</p>
            <div className="ctas in" style={{ ["--d" as string]: "360ms" }}>
              <button className="btn btn-primary btn-block" onClick={start}>{t.hero_cta}</button>
              <p className="small">{t.hero_cta_sub}{LIVE && !user && <> · <a href="#login">{t.nav_login}</a></>}</p>
            </div>
          </div>
          <div className="hero-pic" aria-hidden="true">
            <span className="glow" />
            <div className="orbit">{STAGES.map(({ s, c }, i) => <i key={s} style={{ background: c, ['--a' as string]: `${i * 72}deg` }} />)}</div>
            <Heart className="heart" />
          </div>
        </div>
      </section>

      <section className="band" id="ages">
        <div className="wrap">
          <h2 className="reveal">{t.ages_title}</h2>
          <p>{t.ages_lead}</p>
          <div className="trail reveal" role="group" aria-label={t.ages_title}>
            {STAGES.map(({ s, c }) => (
              <button key={s} className="stop" aria-pressed={stage === s} onClick={() => setStage(s)} style={{ ['--c' as string]: c }}>
                <span className="dot" />{t[`stage_${s}`]}
              </button>
            ))}
          </div>
          {tip && (
            <div className="tipcard swap" key={stage} aria-live="polite">
              <div className="stack" style={{ gap: 8 }}>
                <span className="label">{t.tip_label} · {t[`stage_${stage}`]}</span>
                <h3>{tip[lang][0]}</h3>
                <p className="muted">{tip[lang][1]}</p>
              </div>
              <button className="btn btn-ghost" onClick={() => startWith(tip.concern)}>{t.tip_more}</button>
            </div>
          )}
          <h3 style={{ marginTop: 32 }}>{t.pains_title}</h3>
          <div className="chips">
            {PAINS.map(c => <button key={c} className="chip" onClick={() => startWith(c)}>{t[`c_${c}`]}</button>)}
          </div>
        </div>
      </section>

      <section className="band band-alt">
        <div className="wrap">
          <h2 className="reveal">{t.how_title}</h2>
          <div className="steps">
            {[1, 2, 3].map((n, i) => (
              <div className="step reveal" key={n} style={{ ["--d" as string]: `${i * 110}ms` }}>
                <span className="n" style={{ background: ['var(--coral)', 'var(--sage)', 'var(--sky)'][i] }}>{n}</span>
                <div><h3>{t[`how_${n}_t` as 'how_1_t']}</h3><p>{t[`how_${n}` as 'how_1']}</p></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="band">
        <div className="wrap">
          <h2 className="reveal">{t.feat_title}</h2>
          <div className="feat">
            <div><h3>{t.feat_now}</h3><ul>
              {(['f_profile', 'f_prenatal', 'f_sos'] as const).map(k => <li className="reveal" key={k}><span style={{ color: 'var(--sage-t)' }}><ICheck /></span>{t[k]}</li>)}
            </ul></div>
            <div className="soon"><h3>{t.feat_soon}</h3><ul>
              {(['f_feed', 'f_whatif', 'f_guides', 'f_calendar', 'f_library', 'f_forum'] as const).map(k => <li className="reveal" key={k}><IClock />{t[k]}</li>)}
            </ul></div>
          </div>
        </div>
      </section>

      <section className="band" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="sosband reveal">
            <div className="stack" style={{ gap: 8 }}>
              <h2>{t.sos_band_title}</h2>
              <p className="muted">{t.sos_band_lead}</p>
              <a className="link" href="#sos" style={{ justifySelf: 'start', paddingLeft: 0, color: 'var(--sos)' }}>{t.sos_open}</a>
            </div>
            <Numbers />
          </div>
        </div>
      </section>
    </main>
  )
}
