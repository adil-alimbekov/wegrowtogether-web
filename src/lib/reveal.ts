// Плавное появление блоков при прокрутке.
export function observeReveal() {
  if (!('IntersectionObserver' in window)) { document.querySelectorAll('.reveal').forEach(e => e.classList.add('shown')); return () => {} }
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('shown'); io.unobserve(e.target) } }), { rootMargin: '0px 0px -8% 0px', threshold: 0.08 })
  const scan = () => document.querySelectorAll('.reveal:not(.shown)').forEach(e => io.observe(e))
  scan()
  const mo = new MutationObserver(scan); mo.observe(document.body, { childList: true, subtree: true })
  return () => { io.disconnect(); mo.disconnect() }
}
