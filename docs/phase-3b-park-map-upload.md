# Phase 3b — Park Map Upload

**Status:** proposed, not yet implemented. Spec for review.
**Date drafted:** 2026-05-20.
**Trigger:** Phase 3 audit found Park Map is the only owner-facing field
still URL-only. Owner has to host the file somewhere (Google Drive,
Dropbox public link, etc.) and paste a URL into the Profile form.
**Goal:** let an owner upload a PNG / JPG / WebP image or a PDF file
directly through the Profile page, identical UX shape to the logo
upload we shipped earlier in the launch cycle.

This document is **a spec, not a commit**. No code in this branch
implements the changes below. Approve the shape before any
implementation begins.

---

## Scope (in)

1. Owner can upload one map file per campground from
   `/owner/profile` in the Park Map section.
2. Allowed: `image/png`, `image/jpeg`, `image/webp`, `application/pdf`.
3. Size cap: **5 MB** for images, **10 MB** for PDFs. (PDFs of trail
   networks routinely run 3–8 MB.)
4. Owner can replace the file (re-upload to the same path) or clear it
   (delete from storage + null the column).
5. The existing `park_map_url` text field STAYS as a fallback. Owners
   can still paste an external URL if they prefer. The form shows BOTH
   inputs with helper text explaining "Upload OR paste a link — the
   uploaded file takes precedence when both are set."
6. Guest hub render: images render inline (same `<img>` slot the
   current URL render uses). PDFs render as a card with a "View Park
   Map (PDF)" button that opens the file in a new tab.
7. No change to the `show_park_map` toggle, the `park_map_notes`
   caption field, or the Updates Only page render.

## Scope (out — deliberately)

- No map markers, no clickable hotspots, no SVG layering, no
  client-side zoom/pan beyond what the browser provides natively.
- No image cropping or thumbnail generation. The owner uploads what
  they want guests to see.
- No multi-page PDF preview — just the "open in new tab" button.
- No automatic conversion (PDF → PNG, PNG → WebP, etc.).
- No changes to Stripe, billing, env vars, customer records.

---

## Database

**Migration:** `supabase/migrations/0051_park_map_file_url.sql`

Adds two new nullable columns to `public.campgrounds`:

```sql
alter table public.campgrounds
  add column if not exists park_map_file_url text,
  add column if not exists park_map_file_mime text;
```

- `park_map_file_url` — public Supabase Storage URL (with `?v=<ts>`
  cache-buster, same convention as `logo_url`). Null when the owner
  hasn't uploaded anything.
- `park_map_file_mime` — captured from the upload so the guest hub
  can branch between `<img>` and the PDF button without re-fetching.
  One of: `image/png`, `image/jpeg`, `image/webp`, `application/pdf`.
  Null when `park_map_file_url` is null.

**Why a second column instead of overwriting `park_map_url`:**
keeps URL-only mode intact. Owners who paste a Google Drive link
keep working. The render rule is:
`uploaded_file ?? park_map_url ?? null`. Mig 0048 doesn't move.

**RLS:** `campgrounds` already has the anon-read column allowlist from
mig 0047 — `park_map_file_url` and `park_map_file_mime` need to be
ADDED to that allow-list so the guest hub can read them anonymously.
The migration also re-runs the column-level GRANT.

---

## Storage

**New bucket:** `campground-park-maps` (public, like `campground-logos`).

Created in the Supabase Dashboard OR via a one-time SQL block in the
migration:

```sql
insert into storage.buckets (id, name, public)
values ('campground-park-maps', 'campground-park-maps', true)
on conflict (id) do nothing;
```

**RLS:** none beyond Supabase's defaults. The browser never uploads
directly — uploads go through the server action with the service-role
key, identical to the logo-upload pattern we hardened. Storage policies
exist but the happy path doesn't depend on them.

**File-path convention:** `{campground_id}.{ext}` where `ext` is one
of `png`, `jpg`, `webp`, `pdf`. One map per campground (upsert
overwrites). Same convention as `campground-logos`.

---

## Server actions

**File:** `src/app/owner/(authed)/profile/park-map-actions.ts` (new).

Mirrors `logo-actions.ts` 1:1. Two exports:

### `uploadParkMapAction(campgroundId, formData) → ParkMapUploadState`

1. File presence check.
2. MIME allow-list check (the 4 types above).
3. Size cap: 5 MB images, 10 MB PDF. Branch on `file.type`.
4. `requireCampgroundOwnership(campgroundId)` — reused from
   `logo-actions.ts` (or extract to a shared helper).
5. `admin.storage.from('campground-park-maps').upload(...)` with
   `upsert: true`.
6. Compute public URL + `?v=<timestamp>` cache buster.
7. `admin.from('campgrounds').update({ park_map_file_url, park_map_file_mime })`.
8. `revalidatePath('/owner/profile')`, `revalidatePath('/owner/dashboard')`,
   `revalidatePath('/campground/${slug}')`.
9. Return `{ ok, error, url, mime }`.

### `clearParkMapAction(campgroundId) → ParkMapSaveState`

1. Ownership gate.
2. `admin.storage.from('campground-park-maps').remove([path])` —
   best-effort, do NOT fail the action on a storage 404 (someone may
   have cleared it via the dashboard).
3. `admin.from('campgrounds').update({ park_map_file_url: null, park_map_file_mime: null })`.
4. Revalidate.

**Why service-role-mediated, not browser-direct:** the logo upload
proved storage.objects RLS for the owner role context is fragile in
production. Server-action mediation with an explicit ownership check
is the pattern we've validated.

---

## Owner UI

**File:** `src/components/owner/owner-park-map-upload.tsx` (new).

Shape: identical to `owner-logo-upload.tsx`. File input, preview
panel (img tag for images; "PDF — 4.2 MB" badge for PDFs), Upload
and Remove buttons, inline error states.

**Profile form integration:** the existing Park Map section in
`owner-profile-form.tsx` gets the upload widget added ABOVE the URL
input. Helper text reads:

> Upload a PNG, JPG, WebP, or PDF of your park map (5 MB / 10 MB
> max). Or, if you'd rather, paste a public link to a hosted file
> below — the uploaded file takes precedence if you set both.

No other section of the form changes.

---

## Guest hub render

**File:** `src/app/campground/[slug]/page.tsx` (existing park map card).

Current behavior: shows an `<img>` if `show_park_map && park_map_url`.

New behavior pseudo:

```ts
const fileUrl = cg.park_map_file_url ?? cg.park_map_url ?? null
const mime = cg.park_map_file_mime  // null when fallback URL is used
const isPdf = mime === 'application/pdf'

if (cg.show_park_map && fileUrl) {
  return isPdf
    ? <PdfParkMapCard url={fileUrl} notes={cg.park_map_notes} />
    : <ImageParkMapCard src={fileUrl} notes={cg.park_map_notes} alt="Park map" />
}
```

PDF card shows a flame-bordered panel with the campground name + a
"View Park Map (PDF)" anchor (target="_blank" rel="noopener noreferrer")
and the optional notes line.

Image card is the current rendering.

The `OwnerCampground` SELECT list in
`src/app/owner/(authed)/_helpers.ts` and the anon-safe select list for
the guest hub both need the two new columns added.

---

## Tests

Add to the QA suite (not smoke — gated by `QA_ENV=preview`):

1. **Upload happy path** — owner logs in, uploads a 200 KB PNG, asserts
   the new file appears in the preview, asserts the guest hub shows
   the image.
2. **Size cap** — 6 MB image returns a friendly error and does not
   write the column.
3. **MIME reject** — uploading a `.txt` file returns "PNG, JPG, WebP, or PDF only."
4. **Clear** — Remove button nulls both columns and removes the
   storage object (best-effort assertion: GET on the public URL
   returns 404).
5. **Fallback URL still works** — owner with no upload but a pasted
   URL still shows the image on the guest hub.
6. **Precedence** — if both columns are set, the uploaded file wins.

Smoke suite stays unchanged. The map field is non-critical for the
new-owner happy path.

---

## Files changed (estimate)

| File | Change |
|---|---|
| `supabase/migrations/0051_park_map_file_url.sql` | NEW — 2 columns + bucket + anon-read allow-list |
| `src/app/owner/(authed)/_helpers.ts` | Add 2 columns to OwnerCampground SELECT |
| `src/app/owner/(authed)/profile/park-map-actions.ts` | NEW — upload + clear actions |
| `src/app/owner/(authed)/profile/actions.ts` | No change (URL field still there) |
| `src/components/owner/owner-park-map-upload.tsx` | NEW — upload widget |
| `src/components/owner/owner-profile-form.tsx` | Mount the upload widget in the Park Map section |
| `src/app/campground/[slug]/page.tsx` | Branch image vs PDF render |
| `src/lib/supabase/anon-select-lists.ts` (or wherever the anon allow-list lives) | Add 2 columns |
| `tests/qa/park-map-upload.test.js` | NEW — 6 cases above |

Roughly **~250–350 lines added**, mostly mirroring the logo upload pattern.

---

## Manual steps before merge

1. Apply migration `0051_park_map_file_url.sql` in the Supabase
   Dashboard SQL editor against production.
2. Verify the `campground-park-maps` bucket exists and is marked
   public.
3. Smoke-test on staging: upload a 4 MB PNG, view the guest hub on
   mobile, check Lighthouse doesn't choke.

No Stripe / billing / env-var changes. No customer records touched.

---

## Effort estimate

One focused session — ~3 hours of implementation + ~1 hour of
QA-suite work. Same pattern as the logo upload; no novel infrastructure.

## Decision gates

Before I start building, confirm:

- [ ] Two-column approach (file + fallback URL) vs. single column
      with the URL overwritten on upload?
- [ ] 5 MB image / 10 MB PDF cap reasonable, or different limits?
- [ ] PDF support genuinely useful, or scope down to images-only for
      v1 and add PDF later?
- [ ] Six-test QA suite acceptable scope?
