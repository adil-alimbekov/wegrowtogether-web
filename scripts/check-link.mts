import { createRequire } from 'node:module'
const { chromium } = createRequire('/opt/node22/lib/node_modules/')('playwright')
import { createClient } from '@supabase/supabase-js'
import { execSync } from 'node:child_process'
async function follow(link: string) {
  const r = await fetch(link, { redirect: 'manual' }); const loc = r.headers.get('location')!
  console.log('loc', loc.slice(0,120)); return loc.replace(/^https?:\/\/[^/#]+\/?/, 'http://localhost:5173/')
}
const env = Object.fromEntries(execSync('npx supabase status -o env').toString().split('\n').filter(l => l.includes('=')).map(l => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, '')] }))
const admin = createClient(env.API_URL, env.SERVICE_ROLE_KEY)
const email = `link${Date.now()}@test.kg`
const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 390, height: 800 } }); const p = await ctx.newPage()
p.on('pageerror', e => console.log('ERR', e.message)); p.on('console', m => m.text().includes('INSERT') && console.log('T1', m.text()))
await p.goto('http://localhost:5173/#register')
await p.fill('input[autocomplete=given-name]', 'Айгуль')
await p.fill('input[type=email]', email)
await p.check('#cB'); await p.check('#cC'); await p.check('#cE')
await p.click('text=Получить код'); await p.waitForTimeout(1500)
console.log('after send:', (await p.textContent('.hint'))?.slice(0, 60))
const { data, error } = await admin.auth.admin.generateLink({ type: 'magiclink', email, options: { redirectTo: 'http://localhost:5173/' } })
if (error) throw error
const p2 = await ctx.newPage(); p2.on('pageerror', e => console.log('ERR2', e.message)); p2.on('console', m => m.text().includes('INSERT') && console.log('T2', m.text()))
await p2.goto(await follow(data.properties.action_link)); await p2.waitForTimeout(4000); console.log('ls', await p2.evaluate(() => Object.keys(localStorage)))
console.log('tab2 url:', p2.url(), 'h1:', await p2.textContent('h1'))
await p.waitForTimeout(2000)
console.log('tab1 url:', p.url(), 'h1:', await p.textContent('h1'))
const { data: u } = await admin.auth.admin.listUsers(); const id = u.users.find(x => x.email === email)!.id
const { data: cs } = await admin.from('consents').select('type').eq('user_id', id)
const { data: pr } = await admin.from('profiles').select('display_name').eq('user_id', id)
console.log('consents', cs?.map(c => c.type).sort().join(','), 'name', pr?.[0]?.display_name)
// другой браузер: вход по ссылке без регистрации → экран согласий
const email2 = `x${Date.now()}@test.kg`
const { data: d2 } = await admin.auth.admin.generateLink({ type: 'magiclink', email: email2, options: { redirectTo: 'http://localhost:5173/' } })
const c3 = await b.newContext(); const p3 = await c3.newPage(); await p3.goto(await follow(d2!.properties.action_link)); await p3.waitForTimeout(4000)
console.log('fresh browser h1:', await p3.textContent('h1'))
await b.close()
