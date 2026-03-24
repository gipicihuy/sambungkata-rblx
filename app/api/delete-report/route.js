import { NextResponse } from 'next/server'

const BOT_TOKEN = process.env.NEXT_PUBLIC_STREAM_KEY
const CHANNEL_ID = process.env.NEXT_PUBLIC_STREAM_CHANNEL

export async function DELETE(req) {
  const { searchParams } = new URL(req.url)
  const key = searchParams.get('key')
  if (key !== process.env.NEXT_PUBLIC_REPORT_ACCESS_KEY) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json().catch(() => ({}))
    const { message_id } = body
    if (!message_id) return NextResponse.json({ ok: false, error: 'missing message_id' }, { status: 400 })

    const delRes = await fetch(
      `https://discord.com/api/v10/channels/${CHANNEL_ID}/messages/${message_id}`,
      {
        method: 'DELETE',
        headers: { 'Authorization': `Bot ${BOT_TOKEN}` }
      }
    )

    if (delRes.status === 204) return NextResponse.json({ ok: true })
    return NextResponse.json({ ok: false, error: 'discord error' }, { status: delRes.status })
  } catch (e) {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
