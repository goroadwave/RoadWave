import { type NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

// Cron-safe HTTP route. Configure a scheduler (e.g. Vercel Cron) to call this
// every ~10 minutes with header: Authorization: Bearer ${CRON_SECRET}.
async function handle(request: NextRequest) {
  const authz = request.headers.get('authorization')
  const expected = `Bearer ${process.env.CRON_SECRET}`
  if (!process.env.CRON_SECRET || authz !== expected) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase.rpc('expire_old_check_ins')
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ expired: data ?? 0 })
}

export const GET = handle
export const POST = handle
