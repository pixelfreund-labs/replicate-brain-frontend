import { NextRequest, NextResponse } from 'next/server'
import { parseSchema } from '@/lib/schema'

export async function GET(req: NextRequest) {
  const token = process.env.REPLICATE_API_TOKEN
  if (!token) return NextResponse.json({ error: 'REPLICATE_API_TOKEN not configured' }, { status: 500 })

  const model = req.nextUrl.searchParams.get('model')
  if (!model || !model.includes('/')) {
    return NextResponse.json({ error: 'model must be owner/name format' }, { status: 400 })
  }

  const res = await fetch(`https://api.replicate.com/v1/models/${model}`, {
    headers: { Authorization: `Token ${token}` },
    cache: 'no-store',
  })
  const data = await res.json()
  if (!res.ok) return NextResponse.json({ error: data?.detail ?? 'Model not found' }, { status: res.status })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const properties: Record<string, any> =
    data.latest_version?.openapi_schema?.components?.schemas?.Input?.properties ?? {}

  // Determine the prediction endpoint
  const endpoint = `https://api.replicate.com/v1/models/${model}/predictions`

  return NextResponse.json({
    id: model,
    label: data.name ?? model,
    description: data.description ?? '',
    cover_image_url: data.cover_image_url ?? null,
    endpoint,
    schema: parseSchema(properties),
  })
}
