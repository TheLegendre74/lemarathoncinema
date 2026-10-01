import { NextResponse } from 'next/server'
import { closeDueDuels } from '@/lib/duels'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const closed = await closeDueDuels()

  return NextResponse.json({ closed })
}
