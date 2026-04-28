// Diagnose what's blocking owner signup. Pulls the relevant schema state
// and the most recent auth.users row to see whether trigger + linkage are
// working. Usage:
//   DB_PASSWORD='xxx' node scripts/diagnose-owner-signup.mjs

import { Client } from 'pg'

const PROJECT_REF = 'vfrirdbogwzfvpsflqse'
const password = process.env.DB_PASSWORD
if (!password && !process.env.DATABASE_URL) {
  console.error('Set DB_PASSWORD or DATABASE_URL.')
  process.exit(1)
}

const client = new Client(
  process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }
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

console.log('\n=== campground_role enum values ===')
const enumQ = await client.query(
  `select unnest(enum_range(null::public.campground_role))::text as v`,
)
console.table(enumQ.rows)

console.log('\n=== profiles.role enum values ===')
const userRoleQ = await client.query(
  `select unnest(enum_range(null::public.user_role))::text as v`,
)
console.table(userRoleQ.rows)

console.log('\n=== campground_admins schema ===')
const colsQ = await client.query(`
  select column_name, data_type, is_nullable, column_default
    from information_schema.columns
   where table_schema='public' and table_name='campground_admins'
   order by ordinal_position
`)
console.table(colsQ.rows)

console.log('\n=== Most recent 3 auth.users (last hour) ===')
const usersQ = await client.query(`
  select id, email, email_confirmed_at, created_at
    from auth.users
   where created_at > now() - interval '1 hour'
   order by created_at desc
   limit 3
`)
console.table(
  usersQ.rows.map((r) => ({
    id: r.id,
    email: r.email,
    confirmed: r.email_confirmed_at ? 'yes' : 'no',
    created: r.created_at,
  })),
)

console.log('\n=== Their profiles ===')
const profQ = await client.query(`
  select p.id, p.username, p.role, p.display_name
    from public.profiles p
    join auth.users u on u.id = p.id
   where u.created_at > now() - interval '1 hour'
   order by u.created_at desc
   limit 3
`)
console.table(profQ.rows)

console.log('\n=== Their campground_admins ===')
const caQ = await client.query(`
  select ca.user_id, ca.campground_id, ca.role, c.name as campground_name
    from public.campground_admins ca
    left join public.campgrounds c on c.id = ca.campground_id
   where ca.user_id in (
     select id from auth.users where created_at > now() - interval '1 hour'
   )
   order by ca.created_at desc
`)
console.table(caQ.rows)

console.log('\n=== Recent campgrounds (last hour) ===')
const cgQ = await client.query(`
  select id, name, slug, owner_email, created_at
    from public.campgrounds
   where created_at > now() - interval '1 hour'
   order by created_at desc
   limit 5
`)
console.table(cgQ.rows)

console.log('\n=== Try inserting a campground_admin with role=owner ===')
try {
  await client.query(`begin`)
  await client.query(
    `insert into public.campground_admins (campground_id, user_id, role)
     select c.id, u.id, 'owner'
       from public.campgrounds c, auth.users u
      where c.is_active = true
      limit 1
      on conflict (campground_id, user_id) do nothing`,
  )
  console.log("  OK — 'owner' role accepted by enum")
  await client.query(`rollback`)
} catch (err) {
  console.error('  FAIL:', err.message)
  try {
    await client.query(`rollback`)
  } catch {}
}

await client.end()
