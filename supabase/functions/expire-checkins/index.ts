// Supabase Edge Function: expire-checkins
// Deploy:    supabase functions deploy expire-checkins
// Schedule:  configure a Supabase cron trigger to call this on a schedule, OR
//            use pg_cron via supabase/cron.sql to skip the function entirely.
//
// This function exists for environments where you'd rather schedule via an
// HTTP cron service than pg_cron.

// @ts-expect-error Deno-only import resolved at deploy time.
import { createClient } from 'jsr:@supabase/supabase-js@2'

// @ts-expect-error Deno globals are provided at runtime in Supabase Edge.
Deno.serve(async () => {
  // @ts-expect-error Deno.env exists in the Edge runtime.
  const url = Deno.env.get('SUPABASE_URL')!
  // @ts-expect-error Deno.env exists in the Edge runtime.
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data, error } = await supabase.rpc('expire_old_check_ins')
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  return new Response(JSON.stringify({ expired: data ?? 0 }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
