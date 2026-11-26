import { useState } from 'react'
import { rankTips } from '../content/tips'
import { ageInMonths, formatAge, stageOf, type Stage } from '../lib/age'
import { setFeedback, useStore } from '../lib/store'
import { useT } from '../lib/useT'

export function TipCards({ one, n = 3, more }: { one?: boolean; n?: number; more?: boolean }) {
  const { t, lang } = useT()
  const s = useStore(x => x)
  const [count, setCount] = useState(n)
  const stages: Stage[] = [...new Set([...s.children.map(c => stageOf(ageInMonths({ year: c.birthYear, month: c.birthMonth }))), ...(s.pregnancy ? ['prenatal' as Stage] : [])])]
  const cats = s.profile.concerns.map(c => c.category)
  const all = rankTips({ concerns: cats.length ? cats : ['other'], stages: stages.length ? stages : ['s3_7'], feedback: s.feedback, screenMin: s.profile.screenMin, weekdayMin: s.profile.weekdayMin })
  const tips = all.slice(0, count)
  const whoFor = (st: Stage[]) => {
    const c = s.children.find(ch => st.includes(stageOf(ageInMonths({ year: ch.birthYear, month: ch.birthMonth }))))
    if (c) return `${c.name} · ${formatAge(ageInMonths({ year: c.birthYear, month: c.birthMonth }), lang)}`
    return st.includes('prenatal') && s.pregnancy ? t.stage_prenatal : ''
  }
  const L = lang === 'ru'
    ? { useful: 'Полезно', done: 'Сделали', hide: 'Скрыть', undo: 'Вернуть', more: 'Ещё советы', hidden: 'Скрыто. Больше не покажем.' }
    : { useful: 'Пайдалуу', done: 'Жасадык', hide: 'Жашыруу', undo: 'Кайтаруу', more: 'Дагы кеңештер', hidden: 'Жашырылды. Мындан ары көрсөтпөйбүз.' }
  return (
    <>
      <div className={one ? 'stack' : 'tips'} style={one ? { gap: 12 } : undefined}>
        {tips.map(tp => {
          const fb = s.feedback[tp.id]
          const who = whoFor(tp.stages)
          return (
            <article className={'tip' + (fb === 'done' ? ' done' : '')} key={tp.id}>
              <div className="meta">
                <span className="pill c">{t[`c_${tp.concern}`]}</span>
                {who && <span className="pill s">{who}</span>}
                <span className="pill">{tp.min} {lang === 'ru' ? 'мин' : 'мүн'}</span>
              </div>
              <h3>{tp[lang][0]}</h3>
              <p>{tp[lang][1]}</p>
              <div className="fb" role="group" aria-label={L.useful}>
                <button className="fbb" aria-pressed={fb === 'useful'} onClick={() => setFeedback(tp.id, fb === 'useful' ? null : 'useful')}>♥ {L.useful}</button>
                <button className="fbb" aria-pressed={fb === 'done'} onClick={() => setFeedback(tp.id, fb === 'done' ? null : 'done')}>✓ {L.done}</button>
                <button className="fbb ghost" onClick={() => setFeedback(tp.id, 'hide')}>{L.hide}</button>
              </div>
            </article>
          )
        })}
      </div>
      {more && all.length > count && <button className="btn btn-soft" style={{ marginTop: 12 }} onClick={() => setCount(c => c + 3)}>{L.more}</button>}
    </>
  )
}
