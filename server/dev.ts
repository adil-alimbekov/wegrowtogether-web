// Локальный сервер для /api/* (в продакшене это делает Vercel). Запуск: npm run dev:api
import { createServer } from 'node:http'
import { handleParse } from './parse-handler'

const port = Number(process.env.API_PORT ?? 8787)
createServer(async (req, res) => {
  if (req.method !== 'POST' || req.url !== '/api/parse') { res.writeHead(404).end(); return }
  const chunks: Buffer[] = []
  for await (const c of req) chunks.push(c as Buffer)
  const r = await handleParse(new Request(`http://localhost${req.url}`, { method: 'POST', headers: req.headers as Record<string, string>, body: Buffer.concat(chunks) }))
  res.writeHead(r.status, Object.fromEntries(r.headers)).end(await r.text())
}).listen(port, () => console.log(`api on :${port}`))
