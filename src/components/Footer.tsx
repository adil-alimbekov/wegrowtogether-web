import { Mark } from './Logo'
import { useT } from '../lib/useT'
import { LIVE } from '../lib/backend'
export function Footer() {
  const { t, lang } = useT()
  return (
    <footer className="ftr">
      <div className="wrap ftr-grid">
        <div className="ftr-main">
          <div className="ftr-brand"><Mark /><span><b className="brand">We Grow Together</b><span className="small">{t.tagline}</span></span></div>
          <p className="disc">{t.footer_disclaimer}</p>
          <p className="tiny">© 2026 We Grow Together · {LIVE ? '' : t.footer_demo}{lang === 'kg' ? ' ' + t.footer_draft : ''}</p>
        </div>
        <nav className="ftr-links" aria-label="Документы">
          <a href="#privacy">{t.footer_privacy}</a><a href="#privacy">{t.footer_cookies}</a><a href="#privacy">{t.footer_terms}</a><a href="#sos">SOS</a>
        </nav>
      </div>
    </footer>
  )
}
