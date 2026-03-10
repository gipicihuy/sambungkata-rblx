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

    const ua = req.headers['user-agent'] || ''
    const ref = body.ref || '-'
    const page = body.page || '-'
    const search = body.search || null
    const searchMode = body.searchMode || null
    const ts = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })

    function getBrowser(ua) {
      if (/Edg\//i.test(ua))           return 'Microsoft Edge'
      if (/OPR\/|Opera/i.test(ua))     return 'Opera'
      if (/SamsungBrowser/i.test(ua))  return 'Samsung Browser'
      if (/UCBrowser/i.test(ua))       return 'UC Browser'
      if (/YaBrowser/i.test(ua))       return 'Yandex Browser'
      if (/Firefox\//i.test(ua))       return 'Firefox'
      if (/Chrome\//i.test(ua))        return 'Chrome'
      if (/Safari\//i.test(ua))        return 'Safari'
      if (/MSIE|Trident/i.test(ua))    return 'Internet Explorer'
      return 'Unknown Browser'
    }

    function getDevice(ua) {
      if (/iPad/i.test(ua))                            return 'iPad (iOS)'
      if (/iPhone/i.test(ua))                          return 'iPhone (iOS)'
      if (/Android/i.test(ua) && /Mobile/i.test(ua))  return 'Android Phone'
      if (/Android/i.test(ua))                         return 'Android Tablet'
      if (/Windows NT/i.test(ua))                      return 'Windows PC'
      if (/Macintosh|Mac OS X/i.test(ua))              return 'Mac'
      if (/Linux/i.test(ua))                           return 'Linux'
      return 'Unknown Device'
    }

    const browser = getBrowser(ua)
    const device  = getDevice(ua)

    let geo = { city: '?', regionName: '?', country: '?', isp: '?' }
    try {
      const geoRes = await fetch(`http://ip-api.com/json/${ip}?fields=city,regionName,country,isp,status`, {
        signal: AbortSignal.timeout(3000)
      })
      const geoData = await geoRes.json()
      if (geoData.status === 'success') geo = geoData
    } catch (_) {}

    let msg

    if (search) {
      msg =
        `🔍 User Nyari Kata\n` +
        `\`\`\`\n` +
        `Waktu    : ${ts}\n` +
        `Mode     : ${searchMode === 'awal' ? 'Awalan' : 'Akhiran'}\n` +
        `Query    : ${search}\n` +
        `─────────────────────\n` +
        `Browser  : ${browser}\n` +
        `Device   : ${device}\n` +
        `─────────────────────\n` +
        `IP       : ${ip}\n` +
        `Kota     : ${geo.city}, ${geo.regionName}\n` +
        `Negara   : ${geo.country}\n` +
        `ISP      : ${geo.isp}\n` +
        `\`\`\``
    } else {
      msg =
        `🌐 Visitor Baru\n` +
        `\`\`\`\n` +
        `Waktu    : ${ts}\n` +
        `Halaman  : ${page}\n` +
        `Referrer : ${ref}\n` +
        `─────────────────────\n` +
        `Browser  : ${browser}\n` +
        `Device   : ${device}\n` +
        `─────────────────────\n` +
        `IP       : ${ip}\n` +
        `Kota     : ${geo.city}, ${geo.regionName}\n` +
        `Negara   : ${geo.country}\n` +
        `ISP      : ${geo.isp}\n` +
        `\`\`\``
    }

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
