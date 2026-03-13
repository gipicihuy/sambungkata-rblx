export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).end()

  const BOT_TOKEN = process.env.NEXT_PUBLIC_STREAM_KEY
  const CHANNEL_ID = process.env.NEXT_PUBLIC_STREAM_CHANNEL

  if (!BOT_TOKEN || !CHANNEL_ID) return res.status(500).json({ ok: false })

  try {
    const body = req.body || {}
    const word = (body.word || '').trim().toLowerCase()
    const mode = body.mode === 'akhir' ? 'Akhiran' : 'Awalan'

    if (!word) return res.status(400).json({ ok: false })

    const ts = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })

    const headers = {
      'Authorization': `Bot ${BOT_TOKEN}`,
      'Content-Type': 'application/json'
    }

    let existingMsg = null
    let existingCount = 1

    try {
      let lastId = null
      let found = false
      for (let attempt = 0; attempt < 5 && !found; attempt++) {
        const url = lastId
          ? `https://discord.com/api/v10/channels/${CHANNEL_ID}/messages?limit=100&before=${lastId}`
          : `https://discord.com/api/v10/channels/${CHANNEL_ID}/messages?limit=100`
        const msgRes = await fetch(url, { headers })
        const msgs = await msgRes.json()
        if (!Array.isArray(msgs) || msgs.length === 0) break
        for (const m of msgs) {
          if (
            m.embeds?.[0]?.title === '🚩 Report Kata Tidak Valid' &&
            m.embeds[0].description?.includes(`\`${word.toUpperCase()}\``)
          ) {
            existingMsg = m
            const match = m.embeds[0].description.match(/\*\*(\d+)x\*\* dilaporkan/)
            existingCount = match ? parseInt(match[1]) + 1 : 2
            found = true
            break
          }
        }
        if (!found) lastId = msgs[msgs.length - 1].id
      }
    } catch (_) {}

    const newCount = existingMsg ? existingCount : 1
    const countLabel = newCount === 1
      ? 'Pertama kali dilaporkan'
      : `Dilaporkan **${newCount}x** oleh user berbeda`

    const embed = {
      color: newCount >= 5 ? 0xff0000 : newCount >= 3 ? 0xff6b35 : 0xff3d57,
      title: '🚩 Report Kata Tidak Valid',
      description: `## \`${word.toUpperCase()}\`\n${countLabel}`,
      fields: [
        { name: '📋 Mode', value: mode, inline: true },
      ],
      footer: { text: `Update terakhir: ${ts}` }
    }

    if (existingMsg) {
      await fetch(`https://discord.com/api/v10/channels/${CHANNEL_ID}/messages/${existingMsg.id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ embeds: [embed] })
      })
    } else {
      await fetch(`https://discord.com/api/v10/channels/${CHANNEL_ID}/messages`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ embeds: [embed] })
      })
    }

    return res.status(200).json({ ok: true })
  } catch (e) {
    return res.status(500).json({ ok: false })
  }
}
