export default function xorDbPlugin() {
  return {
    name: 'xor-db',
    transform(code, id) {
      if (!id.endsWith('src/db.js')) return null

      const match = code.match(/export\s+default\s+(\[[\s\S]*?\])/)
      if (!match) return null
      const raw = JSON.parse(match[1])
      const json = JSON.stringify(raw)

      const KEY = Array.from({ length: 16 }, () => Math.floor(Math.random() * 256))

      const bytes = Array.from(new TextEncoder().encode(json))
      const enc = bytes.map((b, i) => b ^ KEY[i % KEY.length])

      return {
        code: `export const _k = ${JSON.stringify(KEY)};\nexport const _e = ${JSON.stringify(enc)};`,
        map: null
      }
    }
  }
}
