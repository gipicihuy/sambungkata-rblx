export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).end()

  const PAKASIR_SLUG = process.env.PAKASIR_SLUG
  const PAKASIR_API_KEY = process.env.PAKASIR_API_KEY

  if (!PAKASIR_SLUG || !PAKASIR_API_KEY) {
    return res.status(500).json({ ok: false, error: 'server misconfigured' })
  }

  const { name, amount, message } = req.body || {}

  if (!name || !amount) return res.status(400).json({ ok: false, error: 'missing fields' })
  if (typeof amount !== 'number' || amount < 1) return res.status(400).json({ ok: false, error: 'minimum amount Rp 1' })

  const order_id = 'SK' + Date.now() + Math.random().toString(36).slice(2, 7).toUpperCase()

  try {
    const pakasirRes = await fetch('https://app.pakasir.com/api/transactioncreate/qris', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        project: PAKASIR_SLUG,
        order_id,
        amount,
        api_key: PAKASIR_API_KEY
      })
    })

    const data = await pakasirRes.json()
    const payment = data?.payment

    if (!pakasirRes.ok || !payment?.payment_number) {
      return res.status(502).json({ ok: false, error: 'gagal membuat transaksi' })
    }

    return res.status(200).json({
      ok: true,
      order_id,
      qr_string: payment.payment_number,
      total: payment.total_payment,
      expired_at: payment.expired_at
    })
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message })
  }
}
