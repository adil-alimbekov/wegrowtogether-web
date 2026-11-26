const p = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, viewBox: '0 0 24 24', width: 20, height: 20, 'aria-hidden': true }
export const IBack = () => <svg {...p}><path d="M15 18l-6-6 6-6" /></svg>
export const INext = () => <svg {...p}><path d="M9 18l6-6-6-6" /></svg>
export const IMic = () => <svg {...p} strokeWidth={2.2}><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg>
export const ISun = () => <svg {...p}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
export const IMoon = () => <svg {...p}><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" /></svg>
export const IAuto = () => <svg {...p}><circle cx="12" cy="12" r="8" /><path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor" /></svg>
export const ICheck = () => <svg {...p} strokeWidth={2.4}><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
export const IClock = () => <svg {...p}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></svg>
export const IPlus = () => <svg {...p}><path d="M12 5v14M5 12h14" /></svg>
export const IKid = () => <svg {...p}><circle cx="12" cy="7" r="3.2" /><path d="M5.5 20.5c.6-4 3.2-6.2 6.5-6.2s5.9 2.2 6.5 6.2" /></svg>
export const IBelly = () => <svg {...p}><circle cx="12" cy="5.5" r="2.5" /><path d="M10 9.5c-1.5 2-2 4.5-.6 6.6.9 1.4 1.1 3 .6 4.4M14 9.5c2.8.6 4.5 2.8 4.2 5.2-.3 2.4-2.6 3.8-5 3.3" /></svg>
export const IBoth = () => <svg {...p}><circle cx="8" cy="7" r="2.6" /><path d="M3 20c.5-3.4 2.5-5.3 5-5.3s4.5 1.9 5 5.3" /><path d="M17.5 4.5c-1.6 1.4-2.7 3.6-1 5.6 1.7 2 4.5 1.5 4.8-.6" /><path d="M15.5 14c2 .3 3.6 1.9 4.2 4.5" /></svg>
export const IShield = () => <svg {...p}><path d="M12 3l7.5 3v5.5c0 4.5-3.2 8.2-7.5 9.5-4.3-1.3-7.5-5-7.5-9.5V6z" /></svg>
