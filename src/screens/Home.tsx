import { useState } from 'react'
import { TipCards } from '../components/TipCards'
import { IBelly, INext, IPlus } from '../components/icons'
import { ageInMonths, formatAge, pregnancyInfo, stageOf } from '../lib/age'
import { AVA } from '../lib/family'
import { go } from '../lib/router'
import { useStore, withdrawConsent, type ConsentType } from '../lib/store'
import { LIVE, deleteAccount, signOut } from '../lib/backend'
import { useT } from '../lib/useT'

export function Home() {
  const { t, lang } = useT()
  const s = useStore(x => x)
  const [confirm, setConfirm] = useState(false)
  const [hideBorn, setHideBorn] = useState(false)
  const p = s.pregnancy && pregnancyInfo({ year: s.pregnancy.dueYear, month: s.pregnancy.dueMonth })
  const consentName: Record<ConsentType, string> = { A: 'Cookies', B: t.cons_B_s, C: t.cons_C_s, D: t.cons_D_title, E: t.cons_E_s }

  return (
    <main className="flow">
      <div className="wrap">
        <h1 style={{ fontSize: 'clamp(28px,7vw,40px)' }}>{t.home_hi.replace('{name}', s.user?.name ?? '')}</h1>
        <p className="lead" style={{ color: 'var(--mute)', marginTop: 8 }}>{t.home_lead}</p>

        <div className="home-grid" style={{ marginTop: 24 }}>
          <section>
            <div className="section-h"><h2>{t.home_children}</h2>
              <a className="btn btn-soft btn-sm" href="#child-new"><IPlus />{t.home_add}</a></div>
            <div className="stack" style={{ gap: 10 }}>
              {s.children.length === 0 && <div className="empty">{t.home_add}…</div>}
              {s.children.map((c, i) => {
                const m = ageInMonths({ year: c.birthYear, month: c.birthMonth })
                return (
                  <a className="kid" key={c.id} href={'#child-' + c.id}>
                    <span className="ava" style={{ background: AVA[i % AVA.length] }}>{c.name.slice(0, 1).toUpperCase()}</span>
                    <span><b>{c.name}</b><span className="age">{formatAge(m, lang)}</span>
                      <span className="small"> · {t[`stage_${stageOf(m)}`]}</span></span>
                    <INext />
                  </a>
                )
              })}
            </div>
          </section>

          <section>
            <div className="section-h"><h2>{t.home_expect}</h2>
              {!s.pregnancy && <a className="btn btn-soft btn-sm" href="#pregnancy"><IPlus />{t.home_add_expect}</a>}</div>
            {s.pregnancy && p ? (
              <div className="preg">
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <span style={{ width: 36, height: 36 }}><IBelly /></span>
                  <a className="btn btn-ghost btn-sm" href="#pregnancy">{t.home_edit}</a>
                </div>
                {p.overdue && !hideBorn ? (
                  <div className="stack" style={{ gap: 10 }}>
                    <b style={{ fontFamily: 'var(--head)', fontSize: 22 }}>{t.home_born}</b>
                    <div className="row">
                      <button className="btn btn-primary btn-sm" onClick={() => { sessionStorage.setItem('wgt.born', '1'); go('child-new') }}>{t.cf_yes}</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => setHideBorn(true)}>{t.home_born_no}</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <span className="big">{t.home_week.replace('{w}', String(p.approxWeek)).replace('{t}', String(p.trimester))}</span>
                    <span>{t.home_months_left.replace('{m}', String(Math.max(0, p.monthsLeft)))} · {t.home_due.replace('{d}', `${t.months[s.pregnancy.dueMonth - 1].toLowerCase()} ${s.pregnancy.dueYear}`)}</span>
                    <div className="bar"><i style={{ width: `${Math.min(100, (p.approxWeek / 40) * 100)}%` }} /></div>
                  </>
                )}
              </div>
            ) : <div className="empty">{t.f_prenatal}</div>}
          </section>

          <section className="full">
            <div className="section-h"><h2>{t.home_today}</h2></div>
            <TipCards more />
          </section>

          <section className="full panel stack" style={{ gap: 10 }}>
            <h3>{t.home_consents}</h3>
            <div className="cons-list">
              {s.consents.map(c => (
                <div className="c" key={c.type}>
                  <span>{consentName[c.type]} · <span className="muted">{c.withdrawnAt ? t.home_withdrawn : t.home_given} {new Date(c.withdrawnAt ?? c.at).toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'ky-KG')}</span></span>
                  {!c.withdrawnAt && c.type !== 'A' && <button className="link" style={{ minHeight: 36, padding: 0 }} onClick={() => withdrawConsent(c.type)}>{t.home_withdraw}</button>}
                </div>
              ))}
            </div>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <button className="link" style={{ color: 'var(--sos)', paddingLeft: 0 }} onClick={() => setConfirm(true)}>{t.home_reset}</button>
              {LIVE && <button className="link" onClick={async () => { await signOut(); go('') }}>{t.home_logout}</button>}
            </div>
          </section>
        </div>
      </div>
      {confirm && (
        <div className="overlay" onClick={() => setConfirm(false)}>
          <div className="sheet" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: 22 }}>{t.home_reset}</h2>
            <p>{t.home_reset_confirm}</p>
            <button className="btn btn-block" style={{ background: 'var(--sos)', color: '#fff' }} onClick={async () => { try { await deleteAccount() } catch { /* покажем ниже */ } sessionStorage.clear(); setConfirm(false); go('') }}>{t.home_reset_yes}</button>
            <button className="btn btn-soft btn-block" onClick={() => setConfirm(false)}>{t.cancel}</button>
          </div>
        </div>
      )}
    </main>
  )
}
