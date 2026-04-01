import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('site_config')
      .select('value')
      .eq('key', 'TIPIAK_LINKS')
      .single()

    const links = data?.value ? JSON.parse(data.value) : []
    return NextResponse.json({ links })
  } catch {
    return NextResponse.json({ links: [] })
  }
}
