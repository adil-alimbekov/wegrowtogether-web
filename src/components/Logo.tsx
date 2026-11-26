import { useStore } from '../lib/store'
import { resolveTheme } from '../lib/theme'
export function Heart({ className, alt = '' }: { className?: string; alt?: string }) {
  const theme = useStore(s => s.theme)
  const dark = resolveTheme(theme) === 'dark'
  return <img className={className} src={dark ? './heart-dark.svg' : './heart-light.svg'} alt={alt} width={512} height={512} />
}

// Плоский знак для шапки и мелких размеров: без фильтров, чётко от 16 px.
export function Mark({ className }: { className?: string }) {
  const theme = useStore(s => s.theme)
  const dark = resolveTheme(theme) === 'dark'
  return <img className={className} src={dark ? './mark-dark.svg' : './mark-light.svg'} alt="" width={40} height={40} />
}
