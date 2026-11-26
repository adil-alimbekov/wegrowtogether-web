// Простой роутер на #имя (работает на любом статическом хостинге и во встроенном превью).
import { useEffect, useState } from 'react'
export function useRoute() {
  const [r, setR] = useState(() => location.hash.slice(1))
  useEffect(() => {
    const f = () => { setR(location.hash.slice(1)); window.scrollTo(0, 0) }
    addEventListener('hashchange', f); return () => removeEventListener('hashchange', f)
  }, [])
  return r
}
export function go(name: string) {
  if (location.hash.slice(1) === name) return
  location.hash = name
}
