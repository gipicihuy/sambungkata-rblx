export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'DELETE') return res.status(405).end()

  const key = req.query.key
  if (key !== process.env.NEXT_PUBLIC_REPORT_ACCESS_KEY) {
    return res.status(401).json({ ok: false, error: 'unauthorized' })
  }

  const BOT_TOKEN = process.env.NEXT_PUBLIC_STREAM_KEY
  const CHANNEL_ID = process.env.NEXT_PUBLIC_STREAM_CHANNEL

  const { message_id } = req.body || {}
  if (!message_id) return res.status(400).json({ ok: false, error: 'missing message_id' })

  try {
    const delRes = await fetch(
      `https://discord.com/api/v10/channels/${CHANNEL_ID}/messages/${message_id}`,
      {
        method: 'DELETE',
        headers: { 'Authorization': `Bot ${BOT_TOKEN}` }
      }
    )

    if (delRes.status === 204) return res.status(200).json({ ok: true })
    return res.status(delRes.status).json({ ok: false, error: 'discord error' })
  } catch (e) {
    return res.status(500).json({ ok: false })
  }
}
