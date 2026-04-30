import { headers } from 'next/headers'
import QRCode from 'qrcode'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

export default async function CampgroundsAdminPage() {
  const admin = createSupabaseAdminClient()

  const { data: campgrounds } = await admin
    .from('campgrounds')
    .select('id, name, slug, city, region')
    .order('name')

  const { data: tokens } = await admin
    .from('campground_qr_tokens')
    .select('campground_id, token')

  const tokenMap = new Map((tokens ?? []).map((t) => [t.campground_id, t.token]))

  const headerList = await headers()
  const proto = headerList.get('x-forwarded-proto') ?? 'http'
  const host = headerList.get('host') ?? 'localhost:3000'
  const origin = `${proto}://${host}`

  const rows = await Promise.all(
    (campgrounds ?? []).map(async (cg) => {
      const token = tokenMap.get(cg.id)
      const url = token ? `${origin}/checkin?token=${token}` : null
      const dataUrl = url
        ? await QRCode.toDataURL(url, {
            width: 256,
            margin: 2,
            color: { dark: '#0a0f1c', light: '#f5ecd9' },
          })
        : null
      return { ...cg, token, url, dataUrl }
    }),
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-cream">
          Campground QR codes
        </h1>
        <p className="mt-1 text-sm text-mist">
          Dev tool. Each QR encodes a /checkin link. Print the QR and stick it on the
          campground sign.
        </p>
      </div>

      <ul className="grid gap-4 sm:grid-cols-2">
        {rows.map((row) => (
          <li
            key={row.id}
            className="flex flex-col items-center gap-3 rounded-2xl border border-white/5 bg-card p-4 shadow-lg shadow-black/20"
          >
            <div className="text-center">
              <h2 className="font-semibold text-cream">{row.name}</h2>
              <p className="text-xs text-mist">
                {[row.city, row.region].filter(Boolean).join(', ') || row.slug}
              </p>
            </div>
            {row.dataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={row.dataUrl}
                alt={`QR code for ${row.name}`}
                className="h-48 w-48 rounded-xl bg-cream p-1"
                width={192}
                height={192}
              />
            ) : (
              <p className="text-xs text-red-300">No token issued.</p>
            )}
            {row.url && (
              <code className="break-all text-center text-xs text-mist px-2">
                {row.url}
              </code>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
