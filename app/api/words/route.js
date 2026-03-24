import words from '../../../data/kbbi.json'

export async function GET() {
  return Response.json(words)
}
