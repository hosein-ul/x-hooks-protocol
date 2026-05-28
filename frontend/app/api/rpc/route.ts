import { NextRequest, NextResponse } from 'next/server'

const X_LAYER_RPC_URLS = [
  'https://rpc.xlayer.tech',
  'https://xlayerrpc.okx.com',
  'https://x-layer.drpc.org',
]

export async function POST(req: NextRequest) {
  const body = await req.text()

  for (const url of X_LAYER_RPC_URLS) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        signal: AbortSignal.timeout(8000),
      })
      if (!res.ok) continue
      const data = await res.json()
      return NextResponse.json(data)
    } catch {
      // try next
    }
  }

  return NextResponse.json(
    { jsonrpc: '2.0', error: { code: -32603, message: 'All RPC endpoints failed' }, id: null },
    { status: 502 },
  )
}
