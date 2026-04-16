import { NextRequest, NextResponse } from 'next/server'

const MODELS: Record<string, string> = {
  'nano-banana-pro': 'https://api.replicate.com/v1/models/google/nano-banana-pro/predictions',
}

export async function POST(req: NextRequest) {
  const token = process.env.REPLICATE_API_TOKEN
  if (!token) {
    return NextResponse.json({ error: 'REPLICATE_API_TOKEN not configured' }, { status: 500 })
  }

  const body = await req.json()
  const { prompt, model = 'nano-banana-pro', aspect_ratio = '16:9', output_format = 'jpg', output_quality = 80 } = body

  if (!prompt?.trim()) {
    return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
  }

  const endpoint = MODELS[model]
  if (!endpoint) {
    return NextResponse.json({ error: `Unknown model: ${model}` }, { status: 400 })
  }

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Token ${token}`,
      'Content-Type': 'application/json',
      Prefer: 'wait',
    },
    body: JSON.stringify({
      input: { prompt, aspect_ratio, output_format, output_quality },
    }),
  })

  const data = await res.json()
  if (!res.ok) {
    return NextResponse.json({ error: data?.detail ?? 'Replicate API error' }, { status: res.status })
  }

  return NextResponse.json(data)
}
