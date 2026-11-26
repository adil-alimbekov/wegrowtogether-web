import { Numbers } from '../components/Numbers'
import { useT } from '../lib/useT'
export function Sos() {
  const { t } = useT()
  const blocks: [string, string[]][] = [[t.sos_sick_t, t.sos_sick], [t.sos_lost_t, t.sos_lost], [t.sos_hurt_t, t.sos_hurt], [t.sos_parent_t, t.sos_parent]]
  return (
    <main className="flow">
      <div className="wrap narrow stack">
        <h1 className="sos-h">{t.sos_title}</h1>
        <p style={{ fontSize: 18, fontWeight: 500 }}>{t.sos_lead}</p>
        <Numbers />
        <p className="tiny">* {t.sos_check}</p>
        {blocks.map(([h, items], i) => (
          <details className="acc" key={h} open={i === 0}>
            <summary>{h}</summary>
            <ol>{items.map(x => <li key={x}>{x}</li>)}</ol>
          </details>
        ))}
        <p className="disc">{t.footer_disclaimer}</p>
      </div>
    </main>
  )
}
export function Privacy() {
  const { t, lang } = useT()
  return (
    <main className="flow">
      <div className="wrap narrow stack">
        <h1>{t.privacy_title}</h1>
        <p className="note warm">{t.privacy_draft}</p>
        {(lang === 'ru'
          ? ['Что мы собираем: имя или как к вам обращаться, телефон или email, язык, ответы в профиле. О ребёнке — имя или псевдоним, месяц и год рождения, пол по желанию, описание характера.', 'Чего мы не собираем: фамилию, адрес, школу или садик ребёнка, документы, фото, диагнозы.', 'Голосовые записи не храним: файл удаляется сразу после расшифровки в текст.', 'Каждое согласие можно отозвать в профиле семьи, а все данные — удалить одной кнопкой.']
          : ['Эмнени чогултабыз: атыңыз, телефон же email, тил, профилдеги жооптор. Бала жөнүндө — аты же лакап аты, туулган айы жана жылы, каалоо боюнча жынысы, мүнөзү.', 'Эмнени чогултпайбыз: баланын фамилиясын, дарегин, мектебин же бала бакчасын, документтерин, сүрөттөрүн, диагноздорун.', 'Үн жазууларын сактабайбыз: файл текстке айлангандан кийин дароо өчүрүлөт.', 'Ар бир макулдукту үй-бүлө профилинен кайтарып алса, бардык маалыматты бир баскыч менен өчүрсө болот.']
        ).map(p => <p key={p}>{p}</p>)}
      </div>
    </main>
  )
}
