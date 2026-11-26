// Голосовой ввод. Демо: Web Speech API браузера (Chrome, Safari, Edge).
// Продакшен: запись MediaRecorder → наш сервер → STT-провайдер в режиме zero retention,
// файл удаляется по сигналу «текст готов» (TTL 15 минут на случай сбоя).
import type { Lang } from './age'

type Rec = { lang: string; continuous: boolean; interimResults: boolean; start(): void; stop(): void; abort(): void; onresult: ((e: any) => void) | null; onend: (() => void) | null; onerror: ((e: any) => void) | null }

export function speechSupported(): boolean {
  const w = window as any
  return !!(w.SpeechRecognition || w.webkitSpeechRecognition)
}

export function startDictation(lang: Lang, onText: (final: string, interim: string) => void, onEnd: (err?: string) => void) {
  const w = window as any
  const C = w.SpeechRecognition || w.webkitSpeechRecognition
  if (!C) { onEnd('unsupported'); return () => {} }
  const r: Rec = new C()
  r.lang = lang === 'kg' ? 'ky-KG' : 'ru-RU'
  r.continuous = true; r.interimResults = true
  let finalText = ''
  r.onresult = (e: any) => {
    let interim = ''
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const res = e.results[i]
      if (res.isFinal) finalText += res[0].transcript.trim() + '. '
      else interim += res[0].transcript
    }
    onText(finalText, interim)
  }
  r.onerror = (e: any) => onEnd(e?.error || 'error')
  r.onend = () => onEnd()
  try { r.start() } catch { onEnd('error') }
  return () => { try { r.stop() } catch { /* ignore */ } }
}
