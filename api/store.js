export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()

  const base = process.env.DSN
  const auth = process.env.DSK

  if (!base || !auth) return res.status(500).json({ ok: false })

  const headers = {
    'Authorization': `Bearer ${auth}`,
    'Content-Type': 'application/json'
  }

  async function cmd(...args) {
    const r = await fetch(`${base}/pipeline`, {
      method: 'POST', headers,
      body: JSON.stringify([args])
    })
    const d = await r.json()
    return d[0]?.result ?? null
  }

  if (req.method === 'POST') {
    const { mode, query } = req.body || {}
    if (!mode || !query) return res.status(400).json({ ok: false })
    const q = query.toLowerCase().trim()
    await cmd('ZINCRBY', `sk:${mode}`, 1, q)
    return res.status(200).json({ ok: true })
  }

  if (req.method === 'GET') {
    const mode = req.query.mode || 'awal'
    const min  = parseInt(req.query.min) || 10
    const top  = parseInt(req.query.top) || 5

    const r = await fetch(`${base}/pipeline`, {
      method: 'POST', headers,
      body: JSON.stringify([['ZREVRANGE', `sk:${mode}`, 0, 49, 'WITHSCORES']])
    })
    const d = await r.json()
    const raw = d[0]?.result || []

    const result = []
    for (let i = 0; i < raw.length; i += 2) {
      const q     = raw[i]
      const count = parseInt(raw[i + 1])
      if (count < min) continue
      result.push({ q, hot: count >= min * 3 })
      if (result.length >= top) break
    }

    return res.status(200).json({ result })
  }

  return res.status(405).end()
}
