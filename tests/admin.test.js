// @ts-check
// Founder admin dashboard. Behavior tests run anonymously (anyone trying
// to reach /admin without being signed in as an admin should be sent to
// /login). Admin-authenticated behavior (status updates, section
// rendering, auto-refresh) requires a test admin fixture and is left for
// manual verification.

import { test, expect } from '@playwright/test'

test.describe('Admin dashboard — anon + structural', () => {
  test('GET /admin redirects an anonymous visitor to /login', async ({
    page,
  }) => {
    await page.goto('/admin', { waitUntil: 'domcontentloaded' })
    await expect(page).toHaveURL(/\/login(\?|$)/)
  })

  test('GET /admin/health redirects an anonymous visitor to /login', async ({
    page,
  }) => {
    await page.goto('/admin/health', { waitUntil: 'domcontentloaded' })
    await expect(page).toHaveURL(/\/login(\?|$)/)
  })

  test('GET /api/admin/health redirects an anonymous request', async ({
    request,
  }) => {
    const res = await request.get('/api/admin/health', {
      maxRedirects: 0,
      failOnStatusCode: false,
    })
    // Either an explicit redirect (3xx) or a 401/403 — anything BUT 200.
    expect(res.status()).not.toBe(200)
  })

  test('admin layout calls requireAdmin and uses AdminShell', async () => {
    const fs = await import('node:fs/promises')
    const src = await fs.readFile('src/app/admin/layout.tsx', 'utf8')
    expect(src).toContain('requireAdmin()')
    expect(src).toContain('AdminShell')
  })

  test('requireAdmin redirects to /login on missing or non-admin user', async () => {
    const fs = await import('node:fs/promises')
    const src = await fs.readFile('src/lib/admin/guard.ts', 'utf8')
    // Anonymous fallthrough.
    expect(src).toContain("redirect('/login')")
    // is_admin gate.
    expect(src).toContain('is_admin')
    // Reads the column off profiles.
    expect(src).toContain("from('profiles')")
  })

  test('migration 0027 declares the spec schema + RPCs + RLS', async () => {
    const fs = await import('node:fs/promises')
    const src = await fs.readFile(
      'supabase/migrations/0027_admin_dashboard.sql',
      'utf8',
    )
    // Columns.
    expect(src).toContain('profiles')
    expect(src).toContain('is_admin boolean not null default false')
    expect(src).toContain('campground_leads')
    expect(src).toContain("status in ('new', 'read', 'replied', 'flagged')")
    expect(src).toContain('campgrounds')
    expect(src).toContain('is_active boolean not null default true')
    // Audit log.
    expect(src).toContain('create table if not exists public.admin_audit_log')
    expect(src).toContain('admin_audit_log_admin_select')
    expect(src).toContain('admin_audit_log_admin_insert')
    // RPCs.
    for (const rpc of [
      'admin_activity_summary',
      'admin_user_overview',
      'admin_signups_30d',
      'admin_signup_provider_split',
    ]) {
      expect(src, `RPC ${rpc} must exist`).toContain(rpc)
    }
    // Each RPC has the is_admin guard.
    const guardCount = (src.match(/p\.is_admin = true/g) ?? []).length
    expect(guardCount).toBeGreaterThanOrEqual(4)
    // Admin policies on the four target tables.
    for (const policy of [
      'profiles_select_admin',
      'campground_leads_admin_select',
      'campground_leads_admin_update',
      'campground_requests_admin_select',
      'campground_requests_admin_update',
      'reports_admin_select',
      'reports_admin_update',
      'campgrounds_admin_update',
    ]) {
      expect(src, `policy ${policy} must exist`).toContain(policy)
    }
  })

  test('all six admin section pages exist and gate via requireAdmin', async () => {
    const fs = await import('node:fs/promises')
    const sections = [
      'src/app/admin/activity/page.tsx',
      'src/app/admin/inbox/page.tsx',
      'src/app/admin/safety/page.tsx',
      'src/app/admin/users/page.tsx',
      'src/app/admin/health/page.tsx',
      'src/app/admin/campgrounds/page.tsx',
    ]
    for (const path of sections) {
      const src = await fs.readFile(path, 'utf8')
      expect(src, `${path} must call requireAdmin()`).toContain('requireAdmin')
    }
  })

  test('every admin server action calls requireAdmin before writing', async () => {
    const fs = await import('node:fs/promises')
    const actions = [
      'src/app/admin/inbox/actions.ts',
      'src/app/admin/safety/actions.ts',
      'src/app/admin/campgrounds/actions.ts',
    ]
    for (const path of actions) {
      const src = await fs.readFile(path, 'utf8')
      expect(src, `${path} must import requireAdmin`).toContain('requireAdmin')
      expect(src, `${path} must be a server module`).toContain("'use server'")
    }
  })

  test('admin health API route gates via requireAdmin and probes the spec routes', async () => {
    const fs = await import('node:fs/promises')
    const src = await fs.readFile('src/app/api/admin/health/route.ts', 'utf8')
    expect(src).toContain('requireAdmin')
    for (const route of [
      "'/'",
      "'/demo'",
      "'/signup'",
      "'/login'",
      "'/contact'",
      "'/privacy'",
      "'/terms'",
      "'/safety'",
      "'/community-rules'",
      "'/campground-partner-terms'",
    ]) {
      expect(src).toContain(route)
    }
  })

  test('empty-state component renders the "Not connected yet" badge', async () => {
    const fs = await import('node:fs/promises')
    const src = await fs.readFile(
      'src/components/admin/empty-state.tsx',
      'utf8',
    )
    expect(src).toContain('Not connected yet')
  })

  test('auto-refresher pauses when the tab is hidden', async () => {
    const fs = await import('node:fs/promises')
    const src = await fs.readFile(
      'src/components/admin/auto-refresher.tsx',
      'utf8',
    )
    expect(src).toContain('visibilitychange')
    expect(src).toContain("'visible'")
  })

  test('home/page.tsx must NOT auto-redirect admins to /admin', async () => {
    // Regression guard. Earlier commit f8146f9 sent admins straight to
    // /admin on every login, which blocked the founder from using the
    // regular camper app. The fix (commit 3303a1f) deliberately lets
    // admins land on /home with the Admin nav link visible — this
    // test fails if anyone re-introduces the redirect.
    const fs = await import('node:fs/promises')
    const src = await fs.readFile('src/app/(app)/home/page.tsx', 'utf8')
    // Strip ALL whitespace so a multiline reformat can't smuggle the
    // redirect past the assertion.
    const collapsed = src.replace(/\s+/g, '')
    expect(collapsed).not.toContain("redirect('/admin')")
    expect(collapsed).not.toContain('redirect("/admin")')
    expect(collapsed).not.toContain("redirect(`/admin`)")
    // Sanity: the admin-bypass for the setup wall must remain in place.
    expect(src).toMatch(/!isAdmin\s*&&\s*!profile\?\.display_name/)
  })

  test('admin nav link in (app) layout is gated on is_admin', async () => {
    const fs = await import('node:fs/promises')
    const src = await fs.readFile('src/app/(app)/layout.tsx', 'utf8')
    expect(src).toContain('is_admin')
    expect(src).toContain('isAdmin')
    expect(src).toContain('href="/admin"')
    // The link must sit inside the isAdmin conditional.
    const i = src.indexOf('isAdmin && (')
    const j = src.indexOf('href="/admin"')
    expect(i).toBeGreaterThan(0)
    expect(j).toBeGreaterThan(i)
  })

  test('no admin client component imports the service-role key', async () => {
    const fs = await import('node:fs/promises')
    const path = await import('node:path')
    async function* walk(dir) {
      for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name)
        if (entry.isDirectory()) yield* walk(full)
        else yield full
      }
    }
    const checked = []
    for (const dir of [
      'src/components/admin',
      'src/app/admin',
      'src/lib/admin',
    ]) {
      for await (const f of walk(dir)) {
        if (!/\.(ts|tsx)$/.test(f)) continue
        const src = await fs.readFile(f, 'utf8')
        expect(
          src,
          `${f} must not reference SUPABASE_SERVICE_ROLE_KEY`,
        ).not.toContain('SUPABASE_SERVICE_ROLE_KEY')
        checked.push(f)
      }
    }
    expect(checked.length).toBeGreaterThan(5)
  })
})
