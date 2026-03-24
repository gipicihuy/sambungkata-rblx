import { NextResponse } from 'next/server'
import settings from '../../../settings.json'

export async function GET() {
  return NextResponse.json(settings)
}
