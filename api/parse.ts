// Vercel Function (Node.js). Логика — в server/parse-handler.ts.
import { handleParse } from '../server/parse-handler.js'
export async function POST(req: Request) { return handleParse(req) }
