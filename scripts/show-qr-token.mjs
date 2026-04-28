// Prints one campground_qr_tokens row + the campground it points at, for
// generating a test QR code with a real UUID.
// Usage:
//   DB_PASSWORD='xxx' node scripts/show-qr-token.mjs

import { Client } from 'pg'

const PROJECT_REF = 'vfrirdbogwzfvpsflqse'
const password = process.env.DB_PASSWORD
const connectionString = process.env.DATABASE_URL

if (!password && !connectionString) {
  console.error('Set DB_PASSWORD or DATABASE_URL.')
  process.exit(1)
}

const client = new Client(
  connectionString
    ? { connectionString, ssl: { rejectUnauthorized: false } }
    : {
        host: `db.${PROJECT_REF}.supabase.co`,
        port: 5432,
        database: 'postgres',
        user: 'postgres',
        password,
        ssl: { rejectUnauthorized: false },
      },
)

await client.connect()

const { rows } = await client.query(`
  select t.token, c.name, c.city, c.region
  from public.campground_qr_tokens t
  join public.campgrounds c on c.id = t.campground_id
  order by t.rotated_at desc
  limit 1
`)

if (rows.length === 0) {
  console.log('No tokens found in campground_qr_tokens.')
} else {
  const r = rows[0]
  console.log('\nSample token:')
  console.log('  token:', r.token)
  console.log('  campground:', r.name, `(${r.city ?? ''}${r.region ? ', ' + r.region : ''})`)
  console.log('\nQR contents to encode (any of these works):')
  console.log('  ' + r.token)
  console.log('  https://www.getroadwave.com/checkin?token=' + r.token)
  console.log('  https://www.getroadwave.com/checkin/' + r.token)
  console.log('')
}

await client.end()
