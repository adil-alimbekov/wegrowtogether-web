import { setState, useStore } from '../lib/store'
import { useT } from '../lib/useT'
import { Mark } from './Logo'
import { LIVE } from '../lib/backend'
import { IAuto, IMoon, ISun } from './icons'

export function Header() {
  const { t, lang } = useT()
  const theme = useStore(s => s.theme)
  const user = useStore(s => s.user)
  const onboarded = useStore(s => s.onboarded)
  const next = theme === 'auto' ? 'light' : theme === 'light' ? 'dark' : 'auto'
  const label = theme === 'auto' ? t.theme_auto : theme === 'light' ? t.theme_light : t.theme_dark
  return (
    <header className="hdr">
      <div className="wrap">
        <a className="logo" href={user && onboarded ? '#home' : '#'} aria-label="We Grow Together">
          <Mark />
          <span><span className="brand"><span className="short">WeGrow</span><span className="full">We Grow Together</span></span><span className="sub">{t.tagline}</span></span>
        </a>
        <div className="seg" role="group" aria-label="Язык / Тил">
          <button aria-pressed={lang === 'ru'} onClick={() => setState({ lang: 'ru' })}>RU</button>
          <button aria-pressed={lang === 'kg'} onClick={() => setState({ lang: 'kg' })}>KG</button>
        </div>
        <button className="icon-btn" onClick={() => setState({ theme: next })} aria-label={label} title={label}>
          {theme === 'auto' ? <IAuto /> : theme === 'light' ? <ISun /> : <IMoon />}
        </button>
        {user && onboarded
          ? <a className="btn btn-soft btn-sm cta-sm" href="#home">{t.nav_home}</a>
          : <>{LIVE && <a className="btn btn-soft btn-sm cta-sm" href="#login">{t.nav_login}</a>}<a className="btn btn-primary btn-sm cta-sm" href="#register">{t.hero_cta}</a></>}
        <a className="sos-btn" href="#sos">{t.nav_sos}</a>
      </div>
    </header>
  )
}
