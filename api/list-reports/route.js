import { NextResponse } from 'next/server'

const BOT_TOKEN = process.env.NEXT_PUBLIC_STREAM_KEY
const CHANNEL_ID = process.env.NEXT_PUBLIC_STREAM_CHANNEL

export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const key = searchParams.get('key')
  if (key !== process.env.NEXT_PUBLIC_REPORT_ACCESS_KEY) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  if (!BOT_TOKEN || !CHANNEL_ID) return NextResponse.json({ ok: false }, { status: 500 })

  try {
    const headers = {
      'Authorization': `Bot ${BOT_TOKEN}`,
      'Content-Type': 'application/json'
    }

    let allMsgs = [], lastId = null

    for (let attempt = 0; attempt < 10; attempt++) {
      const url = lastId
        ? `https://discord.com/api/v10/channels/${CHANNEL_ID}/messages?limit=100&before=${lastId}`
        : `https://discord.com/api/v10/channels/${CHANNEL_ID}/messages?limit=100`
      const msgRes = await fetch(url, { headers })
      const msgs = await msgRes.json()
      if (!Array.isArray(msgs) || msgs.length === 0) break
      allMsgs = allMsgs.concat(msgs)
      lastId = msgs[msgs.length - 1].id
    }

    const reports = []
    for (const m of allMsgs) {
      if (m.embeds?.[0]?.title !== '🚩 Report Kata Tidak Valid') continue
      const desc = m.embeds[0].description || ''
      const wordMatch = desc.match(/`([A-Z]+)`/)
      if (!wordMatch) continue
      const word = wordMatch[1].toLowerCase()
      const countMatch = desc.match(/Dilaporkan \*\*(\d+)x\*\*/)
      const count = countMatch ? parseInt(countMatch[1]) : 1
      reports.push({ word, count, message_id: m.id })
    }

    reports.sort((a, b) => b.count - a.count)
    return NextResponse.json({ ok: true, reports })
  } catch (e) {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
