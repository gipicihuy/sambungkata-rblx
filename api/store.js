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

  if (req.method === 'POST') {
    const { mode, query } = req.body || {}
    if (!mode || !query) return res.status(400).json({ ok: false })

    const key = `s:${mode}:${query.toLowerCase().trim()}`
    await fetch(`${base}/incr/${key}`, { method: 'POST', headers })
    return res.status(200).json({ ok: true })
  }

  if (req.method === 'GET') {
    const mode = req.query.mode || 'awal'
    const min  = parseInt(req.query.min) || 3
    const top  = parseInt(req.query.top) || 5

    const keysRes  = await fetch(`${base}/keys/s:${mode}:*`, { headers })
    const keysData = await keysRes.json()
    const keys     = keysData.result || []

    if (!keys.length) return res.status(200).json({ result: [] })

    const pipeline = keys.map(k => ['GET', k])
    const valsRes  = await fetch(`${base}/pipeline`, {
      method: 'POST', headers,
      body: JSON.stringify(pipeline)
    })
    const valsData = await valsRes.json()

    const pairs = keys.map((k, i) => ({
      q:     k.replace(`s:${mode}:`, ''),
      count: parseInt(valsData[i]?.result || 0)
    }))

    const result = pairs
      .filter(p => p.count >= min)
      .sort((a, b) => b.count - a.count)
      .slice(0, top)
      .map(p => ({ q: p.q, hot: p.count >= min * 3 }))

    return res.status(200).json({ result })
  }

  return res.status(405).end()
}
