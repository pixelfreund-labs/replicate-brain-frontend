import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const LOG_FILE = path.join(process.cwd(), 'data', 'log.json')

function readLog(): object[] {
  try {
    return JSON.parse(fs.readFileSync(LOG_FILE, 'utf-8'))
  } catch {
    return []
  }
}

export async function GET() {
  return NextResponse.json(readLog())
}

export async function POST(req: NextRequest) {
  const entry = await req.json()
  const log = readLog()
  log.unshift({ ...entry, createdAt: new Date().toISOString() })
  fs.writeFileSync(LOG_FILE, JSON.stringify(log, null, 2))
  return NextResponse.json({ ok: true })
}
