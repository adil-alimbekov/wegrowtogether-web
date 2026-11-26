import { useEffect, useRef, useState } from 'react'
import { Flow } from '../components/Flow'
import { CrisisScreen } from '../components/Crisis'
import { Heart } from '../components/Logo'
import { IMic } from '../components/icons'
import { giveConsent, hasConsent, useStore } from '../lib/store'
import { useT } from '../lib/useT'
import { go } from '../lib/router'
import { parseStory } from '../lib/parser'
import { getDraft, setDraft } from '../lib/onboarding'
import { speechSupported, startDictation } from '../lib/speech'
import { logCrisis, parseRemote } from '../lib/backend'

const MAX_SEC = 180

export function Story() {
  const { t, lang } = useT()
  const status = useStore(s => s.status) ?? 'child'
  const s = useStore(x => x)
  const canVoice = hasConsent(s, 'E')
  const consentD = hasConsent(s, 'D')
  const [text, setText] = useState(() => getDraft().text || '')
  const [mode, setMode] = useState<'voice' | 'text'>(canVoice ? 'voice' : 'text')
  const [askD, setAskD] = useState(false)
  const [rec, setRec] = useState(false)
  const [sec, setSec] = useState(0)
  const [interim, setInterim] = useState('')
  const [msg, setMsg] = useState('')
  const [showAll, setShowAll] = useState(false)
  const [busy, setBusy] = useState(false)
  const [crisis, setCrisis] = useState<ReturnType<typeof parseStory> | null>(null)
  const stopRef = useRef<() => void>(() => {})
  const baseRef = useRef('')

  const qs = status === 'expecting' ? ['P1', 'P2', 'P3', 'P4', 'P5'] : status === 'both' ? ['Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6', 'Q7', 'P1', 'P3'] : ['Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6', 'Q7']
  const required = new Set(['Q1', 'Q2', 'P1', 'P2'])
  const visible = showAll ? qs : qs.slice(0, 4)
  const live = text.trim().length > 10 ? parseStory(text, status) : null
  const answered = new Set(live ? qs.filter(q => !live.missing_questions.includes(q)) : [])

  useEffect(() => { setDraft({ ...getDraft(), text }) }, [text])
  useEffect(() => {
    if (!rec) return
    const id = setInterval(() => setSec(x => { if (x + 1 >= MAX_SEC) stop(); return x + 1 }), 1000)
    return () => clearInterval(id)
  }, [rec])
  useEffect(() => () => stopRef.current(), [])

  function begin() {
    if (!speechSupported()) { setMsg(t.story_mic_unavailable); setMode('text'); return }
    setSec(0); setRec(true); setMsg('')
    baseRef.current = text ? text.trim() + ' ' : ''
    stopRef.current = startDictation(lang, (fin, inter) => { setText(baseRef.current + fin); setInterim(inter) }, err => {
      setRec(false); setInterim('')
      if (err && err !== 'no-speech' && err !== 'aborted') { setMsg(t.story_mic_unavailable); setMode('text') }
    })
  }
  function stop() { stopRef.current(); setRec(false) }
  function onMic() {
    if (rec) return stop()
    if (!consentD) return setAskD(true)
    begin()
  }

  async function submit() {
    if (rec) stop()
    setBusy(true)
    const started = Date.now()
    // С согласием E разбор делает нейросеть на сервере; при сбое — локальный разбор.
    const remote = canVoice ? await parseRemote(text, status) : null
    const result = remote ?? parseStory(text, status)
    const wait = Math.max(0, 1200 - (Date.now() - started))
    setTimeout(() => {
      setDraft({ text, result })
      setBusy(false)
      logCrisis(result.crisis_flags).catch(() => {})
      const high = result.crisis_flags.find(f => f.severity === 'high')
      if (high) setCrisis(result)
      else go('confirm')
    }, wait)
  }

  if (busy) return (
    <main className="wrap narrow loading" aria-live="polite">
      <Heart className="heart" />
      <h2>{t.listening}</h2><p className="muted">{t.listening_sub}</p>
    </main>
  )
  if (crisis) {
    const f = crisis.crisis_flags.find(x => x.severity === 'high')!
    return <CrisisScreen flag={f} onContinue={() => { setDraft({ text, result: crisis, crisisSeen: true }); go('confirm') }} />
  }

  const mm = String(Math.floor(sec / 60)).padStart(1, '0'), ss = String(sec % 60).padStart(2, '0')
  return (
    <Flow step={3} back="status">
      <h1>{t.story_title}</h1>
      <p className="lead">{t.story_lead}</p>

      <div className="panel" style={{ marginTop: 20 }}>
        <ol className="qs">
          {visible.map((q, i) => (
            <li key={q} className={(required.has(q) ? 'req ' : '') + (answered.has(q) ? 'done' : '')}>
              <span className="qn">{answered.has(q) ? '✓' : i + 1}</span>
              <div><p>{t.q[q][0]}{required.has(q) && <span style={{ color: 'var(--coral-t)' }}> *</span>}</p><p className="ex">{t.q[q][1]}</p></div>
            </li>
          ))}
        </ol>
        {qs.length > 4 && <button className="link qs-toggle" onClick={() => setShowAll(v => !v)}>{showAll ? (lang === "ru" ? "Свернуть" : "Жыйноо") : (lang === "ru" ? `Ещё ${qs.length - 4} вопроса` : `Дагы ${qs.length - 4} суроо`)}</button>}
      </div>

      {mode === 'voice' ? (
        <div className="mic-wrap">
          <button className={'mic' + (rec ? ' rec' : '')} onClick={onMic} aria-label={rec ? t.story_stop : t.story_mic} aria-pressed={rec}><IMic /></button>
          <b style={{ fontFamily: 'var(--head)', fontSize: 18 }}>{rec ? t.story_rec : t.story_mic}</b>
          {rec && <span className="timer">{mm}:{ss} / 3:00</span>}
          {(text || interim) && <p className="small" style={{ maxWidth: '52ch' }}>{text}<span style={{ opacity: .6 }}>{interim}</span></p>}
          <button className="link" onClick={() => { stop(); setMode('text') }}>{t.story_text}</button>
        </div>
      ) : (
        <div className="stack" style={{ marginTop: 18, gap: 10 }}>
          {!canVoice && <p className="note">{t.story_no_e}</p>}
          {msg && <p className="note warm">{msg}</p>}
          <label className="field"><span className="sr">{t.story_text}</span>
            <textarea className="textarea" value={text} onChange={e => setText(e.target.value)} placeholder={t.story_ph} maxLength={4000} />
          </label>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <button className="link" onClick={() => setText(t.story_ph.replace(/^[^:]+:\s*/, ''))}>{t.story_example}</button>
            {canVoice && <button className="link" onClick={() => { setMsg(''); setMode('voice') }}>{t.story_voice}</button>}
          </div>
        </div>
      )}

      <button className="btn btn-primary btn-block" style={{ marginTop: 18 }} disabled={text.trim().length < 3} onClick={submit}>{t.story_send}</button>

      {askD && (
        <div className="overlay" onClick={() => setAskD(false)}>
          <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="d-h" onClick={e => e.stopPropagation()}>
            <h2 id="d-h" style={{ fontSize: 24 }}>{t.cons_D_title}</h2>
            <p>{t.cons_D}</p>
            <button className="btn btn-primary btn-block" onClick={() => { giveConsent('D'); setAskD(false); begin() }}>{t.cons_D_allow}</button>
            <button className="btn btn-soft btn-block" onClick={() => { setAskD(false); setMode('text') }}>{t.cons_D_text}</button>
          </div>
        </div>
      )}
    </Flow>
  )
}
