export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).end()

  const token = process.env.NK
  const chatId = process.env.NC

  if (!token || !chatId) return res.status(500).json({ ok: false })

  try {
    const body = req.body || {}
    const ip =
      req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      req.headers['x-real-ip'] ||
      'unknown'

    const ua = req.headers['user-agent'] || 'unknown'
    const ref = body.ref || '-'
    const page = body.page || '-'
    const ts = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })

    const msg =
      `🌐 Visitor Baru\n` +
      `\`\`\`\n` +
      `Waktu    : ${ts}\n` +
      `Halaman  : ${page}\n` +
      `Referrer : ${ref}\n` +
      `IP       : ${ip}\n` +
      `UA       : ${ua.slice(0, 80)}\n` +
      `\`\`\``

    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: msg,
        parse_mode: 'Markdown'
      })
    })

    return res.status(200).json({ ok: true })
  } catch (e) {
    return res.status(500).json({ ok: false })
  }
}
