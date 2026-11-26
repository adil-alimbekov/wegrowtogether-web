// Простой роутер на #имя (работает на любом статическом хостинге и во встроенном превью).
import { useEffect, useState } from 'react'
const cur = () => { const h = location.hash.slice(1); return h.includes('=') ? '' : h.split('?')[0] }
export function useRoute() {
  const [r, setR] = useState(cur)
  useEffect(() => {
    const f = () => { setR(cur()); window.scrollTo(0, 0) }
    addEventListener('hashchange', f); return () => removeEventListener('hashchange', f)
  }, [])
  return r
}
export function go(name: string) {
  if (cur() === name && !location.hash.includes('?')) return
  location.hash = name
}
