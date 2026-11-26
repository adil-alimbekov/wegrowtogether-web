import { useT } from '../lib/useT'
// Номера — в конфиге, а не в коде экранов: 111 и линию психологической помощи нужно прозвонить до запуска.
export const EMERGENCY = [
  { n: '103', k: 'sos_103', verified: true }, { n: '102', k: 'sos_102', verified: true }, { n: '101', k: 'sos_101', verified: true },
  { n: '112', k: 'sos_112', verified: true }, { n: '111', k: 'sos_111', verified: false },
] as const

export function Numbers({ only }: { only?: string[] }) {
  const { t } = useT()
  const list = only ? EMERGENCY.filter(e => only.includes(e.n)) : EMERGENCY
  return (
    <div className="nums" style={only ? { gridTemplateColumns: 'repeat(2,minmax(0,1fr))' } : undefined}>
      {list.map(e => (
        <a key={e.n} className="num" href={`tel:${e.n}`}>
          <b>{e.n}</b><span>{t[e.k]}{!e.verified && ' *'}</span>
        </a>
      ))}
    </div>
  )
}
