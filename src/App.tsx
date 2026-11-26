import { useEffect } from 'react'
import { Header } from './components/Header'
import { Footer } from './components/Footer'
import { CookieBanner } from './components/CookieBanner'
import { Landing } from './screens/Landing'
import { Register } from './screens/Register'
import { Status } from './screens/Status'
import { Story } from './screens/Story'
import { Confirm } from './screens/Confirm'
import { Picks } from './screens/Picks'
import { Home } from './screens/Home'
import { ChildForm, PregnancyForm } from './screens/ChildForm'
import { Privacy, Sos } from './screens/Sos'
import { useRoute } from './lib/router'
import { hasConsent, useStore } from './lib/store'
import { applyTheme } from './lib/theme'
import { observeReveal } from './lib/reveal'
import { LIVE, startSync } from './lib/backend'

startSync()

export default function App() {
  const route = useRoute()
  const theme = useStore(s => s.theme)
  const lang = useStore(s => s.lang)
  const user = useStore(s => s.user)
  const onboarded = useStore(s => s.onboarded)
  const agreed = useStore(s => hasConsent(s, 'B') && hasConsent(s, 'C'))

  useEffect(() => {
    applyTheme(theme)
    const mq = matchMedia('(prefers-color-scheme: dark)')
    const f = () => applyTheme(theme)
    mq.addEventListener('change', f)
    const id = setInterval(f, 60_000) // вечерний режим включается сам в 21:00
    return () => { mq.removeEventListener('change', f); clearInterval(id) }
  }, [theme])
  useEffect(() => observeReveal(), [])
  useEffect(() => { document.documentElement.lang = lang === 'kg' ? 'ky' : 'ru' }, [lang])

  const needUser = ['status', 'story', 'confirm', 'picks', 'home', 'child-new', 'pregnancy'].includes(route) || route.startsWith('child-')
  let screen
  if (needUser && !user) screen = <Register />
  else if (LIVE && user && !agreed && !['', 'sos', 'privacy'].includes(route)) screen = <Register key="finish" finish />
  else if (route === 'login') screen = user && onboarded ? <Home /> : <Register key="login" login />
  else if (route === 'register') screen = user ? (onboarded ? <Home /> : <Status />) : <Register />
  else if (route === 'status') screen = <Status />
  else if (route === 'story') screen = <Story />
  else if (route === 'confirm') screen = <Confirm />
  else if (route === 'picks') screen = <Picks />
  else if (route === 'home') screen = <Home />
  else if (route === 'child-new') screen = <ChildForm key="new" />
  else if (route.startsWith('child-')) screen = <ChildForm key={route} id={route.slice(6)} />
  else if (route === 'pregnancy') screen = <PregnancyForm />
  else if (route === 'sos') screen = <Sos />
  else if (route === 'privacy') screen = <Privacy />
  else screen = <Landing />

  return (
    <>
      <Header />
      {screen}
      {(route === '' || route === 'sos' || route === 'privacy' || route === 'home') && <Footer />}
      <CookieBanner />
    </>
  )
}
