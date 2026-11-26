import { dict } from '../i18n'
import { useStore } from './store'
export function useT() { const lang = useStore(s => s.lang); return { t: dict[lang], lang } }
