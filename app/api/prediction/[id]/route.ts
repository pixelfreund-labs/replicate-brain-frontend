import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = process.env.REPLICATE_API_TOKEN
  if (!token) {
    return NextResponse.json({ error: 'REPLICATE_API_TOKEN not configured' }, { status: 500 })
  }

  const { id } = await params
  const res = await fetch(`https://api.replicate.com/v1/predictions/${id}`, {
    headers: { Authorization: `Token ${token}` },
    cache: 'no-store',
  })

  const data = await res.json()
  if (!res.ok) {
    return NextResponse.json({ error: data?.detail ?? 'Replicate API error' }, { status: res.status })
  }

  return NextResponse.json(data)
}
