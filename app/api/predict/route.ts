import { NextRequest, NextResponse } from 'next/server'

const BUILTIN_ENDPOINTS: Record<string, string> = {
  'nano-banana-pro': 'https://api.replicate.com/v1/models/google/nano-banana-pro/predictions',
}

export async function POST(req: NextRequest) {
  const token = process.env.REPLICATE_API_TOKEN
  if (!token) {
    return NextResponse.json({ error: 'REPLICATE_API_TOKEN not configured' }, { status: 500 })
  }

  const body = await req.json()
  const { input, endpoint, modelId } = body

  if (!input?.prompt?.trim()) {
    return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
  }

  const resolvedEndpoint = endpoint ?? BUILTIN_ENDPOINTS[modelId]
  if (!resolvedEndpoint) {
    return NextResponse.json({ error: `Unknown model: ${modelId}` }, { status: 400 })
  }

  const res = await fetch(resolvedEndpoint, {
    method: 'POST',
    headers: {
      Authorization: `Token ${token}`,
      'Content-Type': 'application/json',
      Prefer: 'wait',
    },
    body: JSON.stringify({ input }),
  })

  const data = await res.json()
  if (!res.ok) {
    return NextResponse.json({ error: data?.detail ?? 'Replicate API error' }, { status: res.status })
  }

  return NextResponse.json(data)
}
