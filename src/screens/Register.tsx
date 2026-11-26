import { useState, type FormEvent } from 'react'
import { Flow } from '../components/Flow'
import { getState, giveConsent, setState } from '../lib/store'
import { LIVE, PHONE_AUTH, savePending, sendCode, verifyCode } from '../lib/backend'
import { useT } from '../lib/useT'
import { go } from '../lib/router'

function Consent({ id, short, full, req, checked, onChange, note }: { id: string; short: string; full: string; req: boolean; checked: boolean; onChange: (v: boolean) => void; note?: string }) {
  const { t } = useT()
  return (
    <label className="check" htmlFor={id}>
      <input id={id} type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
      <div>
        <span className="t">{short}<span className={'tag' + (req ? ' req' : '')}>{req ? t.required : t.optional}</span></span>
        {note && <p className="hint" style={{ marginTop: 4 }}>{note}</p>}
        <details onClick={e => e.stopPropagation()}><summary onClick={e => e.stopPropagation()}>{t.cons_more}</summary>{full}</details>
      </div>
    </label>
  )
}

export function Register({ login = false, finish = false }: { login?: boolean; finish?: boolean }) {
  const { t, lang } = useT()
  const canPhone = !LIVE || PHONE_AUTH
  const [name, setName] = useState(() => getState().user?.name ?? '')
  const [method, setMethod] = useState<'phone' | 'email'>(canPhone && !LIVE ? 'phone' : 'email')
  const [contact, setContact] = useState(method === 'phone' ? '+996 ' : '')
  const [codeSent, setCodeSent] = useState(false)
  const [code, setCode] = useState('')
  const [b, setB] = useState(false), [c, setC] = useState(false), [e, setE] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(() => (location.hash.includes('expired') ? 'expired' : ''))
  const L = lang === 'ru'
    ? { login_t: 'Вход', login_lead: 'Пришлём код на почту, пароль не нужен.', login_btn: 'Войти', sent: 'Письмо отправлено. Нажмите кнопку в письме или введите код, если он там есть. Проверьте и папку «Спам».', expired: 'Ссылка из письма устарела или уже использована. Запросите новую.', fin_t: 'Почти готово', fin_lead: 'Вы вошли. Осталось представиться и отметить согласия.', bad: 'Код не подошёл или устарел. Запросите новый.', fail: 'Не получилось отправить код. Попробуйте через минуту.', have: 'Уже есть профиль? Войти', no: 'Нет профиля? Создать', code_hint: 'Код из письма, 6 цифр.' }
    : { login_t: 'Кирүү', login_lead: 'Почтаңызга код жиберебиз, сырсөз керек эмес.', login_btn: 'Кирүү', sent: 'Кат жөнөтүлдү. Каттагы баскычты басыңыз же код болсо, аны жазыңыз. «Спам» папкасын да текшериңиз.', expired: 'Каттагы шилтеме эскирген же колдонулган. Жаңысын сураңыз.', fin_t: 'Дээрлик даяр', fin_lead: 'Сиз кирдиңиз. Атыңызды жазып, макулдуктарды белгилеңиз.', bad: 'Код туура эмес же эскирген. Жаңысын сураңыз.', fail: 'Код жөнөтүлгөн жок. Бир мүнөттөн кийин аракет кылыңыз.', have: 'Профилиңиз барбы? Кирүү', no: 'Профиль жокпу? Түзүү', code_hint: 'Каттагы 6 сандуу код.' }

  const contactOk = method === 'phone' ? contact.replace(/\D/g, '').length >= 12 : /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(contact.trim())
  const codeOk = LIVE ? /^\d{6,8}$/.test(code) : /^\d{4}$/.test(code)
  const regOk = login || (name.trim().length > 0 && b && c)
  const ready = finish ? regOk && !busy : regOk && contactOk && codeSent && codeOk && !busy
  const pending = () => savePending(login ? null : { name: name.trim(), consents: ['B', 'C', ...(e ? ['E' as const] : [])] })

  async function send() {
    setErr(''); setBusy(true)
    if (LIVE) pending()
    try { await sendCode({ method, value: contact }); setCodeSent(true) } catch { setErr(L.fail) } finally { setBusy(false) }
  }

  const submit = async (ev: FormEvent) => {
    ev.preventDefault()
    if (!ready) return
    if (finish) {
      setState(s => (s.user ? { user: { ...s.user, name: name.trim() } } : {}))
      giveConsent('B'); giveConsent('C'); if (e) giveConsent('E')
      go(getState().onboarded ? 'home' : 'status'); return
    }
    setErr(''); setBusy(true)
    if (LIVE) pending()
    try { await verifyCode({ method, value: contact }, code) } catch { setErr(L.bad); setBusy(false); return }
    setBusy(false)
    if (login || LIVE) { go(getState().onboarded ? 'home' : 'status'); return }
    setState(s => ({ user: { name: name.trim(), contact: contact.trim(), method, createdAt: s.user?.createdAt ?? new Date().toISOString() } }))
    giveConsent('B'); giveConsent('C'); if (e) giveConsent('E')
    go(getState().onboarded ? 'home' : 'status')
  }
  const switchMethod = (m: 'phone' | 'email') => { setMethod(m); setContact(m === 'phone' ? '+996 ' : ''); setCodeSent(false); setCode('') }

  return (
    <Flow step={1} back="">
      <h1>{finish ? L.fin_t : login ? L.login_t : t.reg_title}</h1>
      <p className="lead">{finish ? L.fin_lead : login ? L.login_lead : t.reg_lead}</p>
      <form className="stack" style={{ marginTop: 22 }} onSubmit={submit} noValidate>
        <div className="panel stack">
          {!login && <label className="field"><span>{t.reg_name}</span>
            <input className="input" value={name} onChange={x => setName(x.target.value)} placeholder={t.reg_name_ph} autoComplete="given-name" maxLength={40} />
          </label>}
          {!finish && <>{canPhone && <div className="seg" role="group" style={{ justifySelf: 'start' }}>
            <button type="button" aria-pressed={method === 'phone'} onClick={() => switchMethod('phone')} style={{ padding: '0 16px', height: 40 }}>{t.reg_by_phone}</button>
            <button type="button" aria-pressed={method === 'email'} onClick={() => switchMethod('email')} style={{ padding: '0 16px', height: 40 }}>{t.reg_by_email}</button>
          </div>}
          <label className="field"><span>{method === 'phone' ? t.reg_phone : t.reg_email}</span>
            <div className="two" style={{ gridTemplateColumns: 'minmax(0,1fr) auto' }}>
              <input className="input" value={contact} onChange={x => { setContact(x.target.value); setCodeSent(false) }} inputMode={method === 'phone' ? 'tel' : 'email'} type={method === 'phone' ? 'tel' : 'email'} autoComplete={method === 'phone' ? 'tel' : 'email'} placeholder={method === 'phone' ? '+996 555 123 456' : 'name@mail.kg'} />
              <button type="button" className="btn btn-soft" style={{ minHeight: 52, padding: '0 14px', fontSize: 15 }} disabled={!contactOk || busy || (LIVE && !regOk)} onClick={send}>{t.reg_send_code}</button>
            </div>
          </label>
          {codeSent && (
            <label className="field"><span>{method === 'phone' ? t.reg_code : t.reg_code_email}</span>
              <input className="input" value={code} onChange={x => setCode(x.target.value.replace(/\D/g, '').slice(0, 8))} inputMode="numeric" autoComplete="one-time-code" placeholder={LIVE ? '000000' : '0000'} style={{ letterSpacing: '.3em', fontWeight: 600, maxWidth: 200 }} autoFocus />
              <span className="hint">{LIVE ? (method === 'email' ? L.sent : L.code_hint) : t.reg_code_hint}</span>
            </label>
          )}
          </>}
          {err && <p className="err" role="alert">{err === 'expired' ? L.expired : err}</p>}
        </div>
        {!login && <div className="stack" style={{ gap: 10 }}>
          <h3>{t.reg_consents}</h3>
          <Consent id="cB" short={t.cons_B_s} full={t.cons_B} req checked={b} onChange={setB} />
          <Consent id="cC" short={t.cons_C_s} full={t.cons_C} req checked={c} onChange={setC} />
          <Consent id="cE" short={t.cons_E_s} full={t.cons_E} req={false} checked={e} onChange={setE} note={t.cons_E_note} />
        </div>}
        {!login && !(b && c) && <p className="hint">{t.reg_need}</p>}
        <button className="btn btn-primary btn-block" type="submit" disabled={!ready}>{busy ? '…' : login ? L.login_btn : t.reg_next}</button>
        {LIVE && !finish && <a className="link" style={{ justifySelf: 'center' }} href={login ? '#register' : '#login'}>{login ? L.no : L.have}</a>}
      </form>
    </Flow>
  )
}
