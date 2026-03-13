export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).end()

  const key = req.query.key
  if (key !== process.env.NEXT_PUBLIC_REPORT_ACCESS_KEY) {
    return res.status(401).json({ ok: false, error: 'unauthorized' })
  }

  const BOT_TOKEN = process.env.NEXT_PUBLIC_STREAM_KEY
  const CHANNEL_ID = process.env.NEXT_PUBLIC_STREAM_CHANNEL

  if (!BOT_TOKEN || !CHANNEL_ID) return res.status(500).json({ ok: false })

  try {
    const headers = {
      'Authorization': `Bot ${BOT_TOKEN}`,
      'Content-Type': 'application/json'
    }

    let allMsgs = []
    let lastId = null

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
      reports.push({ word, count })
    }

    reports.sort((a, b) => b.count - a.count)

    const listLines = reports.map(r => `${r.word.toUpperCase()} : ${r.count}`).join('\n')
    const codeBlock = reports.map(r => r.word).join(', ')

    const text = reports.length
      ? `${listLines}\n\n${codeBlock}`
      : 'belum ada report.'

    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    return res.status(200).send(text)
  } catch (e) {
    return res.status(500).send('error')
  }
}
