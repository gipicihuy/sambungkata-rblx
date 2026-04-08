export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const DISCORD_WEBHOOK = process.env.DISCORD_WEBHOOK_URL

  const { order_id, amount, status, payment_method, completed_at, project, is_sandbox } = req.body || {}

  const message = {
    embeds: [
      {
        title: is_sandbox ? '🧪 [SANDBOX] Donasi Masuk' : '💰 Donasi Masuk!',
        color: status === 'completed' ? 0x4ade80 : 0xfbbf24,
        fields: [
          { name: 'Order ID',        value: order_id || '-',                    inline: true },
          { name: 'Jumlah',          value: `Rp ${Number(amount).toLocaleString('id-ID')}`, inline: true },
          { name: 'Status',          value: status || '-',                      inline: true },
          { name: 'Metode',          value: payment_method || '-',              inline: true },
          { name: 'Proyek',          value: project || '-',                     inline: true },
          { name: 'Waktu',           value: completed_at ? new Date(completed_at).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }) : '-', inline: true },
        ],
        timestamp: new Date().toISOString(),
      }
    ]
  }

  try {
    const discordRes = await fetch(DISCORD_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message)
    })

    if (!discordRes.ok) {
      const err = await discordRes.json()
      console.error('Discord error:', err)
      return res.status(502).json({ ok: false, error: err })
    }

    return res.status(200).json({ ok: true })
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message })
  }
}
