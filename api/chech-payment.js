export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).end()

  const PAKASIR_SLUG = process.env.PAKASIR_SLUG
  const PAKASIR_API_KEY = process.env.PAKASIR_API_KEY

  if (!PAKASIR_SLUG || !PAKASIR_API_KEY) {
    return res.status(500).json({ ok: false, error: 'server misconfigured' })
  }

  const { order_id, amount } = req.query
  if (!order_id || !amount) return res.status(400).json({ ok: false, error: 'missing params' })

  try {
    const url = `https://app.pakasir.com/api/transactiondetail?project=${PAKASIR_SLUG}&amount=${amount}&order_id=${order_id}&api_key=${PAKASIR_API_KEY}`
    const pakasirRes = await fetch(url)
    const data = await pakasirRes.json()

    const status = data?.transaction?.status || 'pending'
    return res.status(200).json({ ok: true, status })
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message })
  }
}
