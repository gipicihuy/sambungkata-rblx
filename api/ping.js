export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).end()

  const webhookUrl = process.env.NEXT_PUBLIC_ANALYTICS_ID

  if (!webhookUrl) return res.status(500).json({ ok: false })

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

    const isSearch = !!search
    const color = isSearch ? 0xf97316 : 0x5865f2

    const embed = {
      color,
      title: isSearch ? '🔍 User Nyari Kata' : '🌐 Visitor Baru',
      fields: [
        ...(isSearch
          ? [
              { name: 'Query',    value: `\`${search}\``,                              inline: true },
              { name: 'Mode',     value: searchMode === 'awal' ? 'Awalan' : 'Akhiran', inline: true },
            ]
          : [
              { name: 'Halaman',  value: `\`${page}\``,                                inline: true },
              { name: 'Referrer', value: `\`${ref}\``,                                 inline: true },
            ]
        ),
        { name: 'Browser', value: browser,                                             inline: true },
        { name: 'Device',  value: device,                                              inline: true },
        { name: 'IP',      value: `\`${ip}\``,                                         inline: true },
        { name: 'Lokasi',  value: `${geo.city}, ${geo.regionName}, ${geo.country}`,    inline: true },
        { name: 'ISP',     value: geo.isp,                                             inline: true },
      ],
      footer: { text: ts },
    }

    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [embed] })
    })

    return res.status(200).json({ ok: true })
  } catch (e) {
    return res.status(500).json({ ok: false })
  }
}
