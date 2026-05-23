-- 0061_meetup_dismissals.sql
--
-- Per-camper "I don't want to see this meetup in MY list anymore"
-- record. Strictly camper-side; never deletes the meetup row, never
-- hides it from any other camper, and never affects the owner's
-- view of meetups they created.
--
-- Where the filter applies (this migration just defines the storage;
-- the filter lives in the (app)/meetups/page.tsx query):
--   * Signed-in /meetups page -- past + camper-posted upcoming +
--     hosted upcoming, all three sections, are filtered against the
--     caller's dismissed list.
--   * QR campground hub /campground/[slug] -- INTENTIONALLY NOT
--     filtered. The campground hub is the public campground surface
--     and shows the campground's own meetups; per-camper preference
--     doesn't belong there.
--   * Lantern + AppNav badges -- the dismiss action also marks the
--     related notifications.is_read so the Meetups tab badge clears
--     without leaving stale unread state behind.
--
-- Schema choice:
--   * Composite PK on (user_id, meetup_id) so a camper can't
--     accidentally dismiss the same meetup twice and we get UPSERT
--     idempotency by definition.
--   * ON DELETE CASCADE on both FKs so:
--       - owner deletes the meetup -> dismissal rows vanish (orphans
--         would never be queried since the meetup is gone, but
--         keeping them would block future re-uses of the id)
--       - user gets deleted -> dismissal rows vanish (no orphan
--         per-user state lingering)

create table if not exists public.meetup_dismissals (
  user_id uuid not null references auth.users(id) on delete cascade,
  meetup_id uuid not null references public.meetups(id) on delete cascade,
  dismissed_at timestamptz not null default now(),
  primary key (user_id, meetup_id)
);

comment on table public.meetup_dismissals is
  'Per-camper dismissal of a meetup from THEIR own /meetups list. Does not delete the meetup or affect other campers or the owner.';

-- Index for the by-user filter the /meetups page runs every render.
-- The PK already covers (user_id, meetup_id) lookups; this is for
-- the "give me everything I dismissed" sweep that the page does.
create index if not exists meetup_dismissals_user_idx
  on public.meetup_dismissals (user_id);

alter table public.meetup_dismissals enable row level security;

-- SELECT: a camper sees their own dismissals only. No cross-camper
-- visibility -- a camper can't tell what anyone else has dismissed.
drop policy if exists meetup_dismissals_select_own on public.meetup_dismissals;
create policy meetup_dismissals_select_own
  on public.meetup_dismissals
  for select
  to authenticated
  using (user_id = (select auth.uid()));

-- INSERT: a camper can dismiss any meetup for themselves. They can
-- only insert with their own user_id. The meetup_id can be any
-- meetup row -- we don't gate on "has the camper actually seen this
-- meetup" because the UI only renders dismiss buttons on meetups
-- already on the camper's screen.
drop policy if exists meetup_dismissals_insert_own on public.meetup_dismissals;
create policy meetup_dismissals_insert_own
  on public.meetup_dismissals
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

-- DELETE: a camper can undismiss their own rows. Lets a future
-- "Undo" / "Show cleared meetups" surface work without a separate
-- RPC. Other campers' dismissals stay private.
drop policy if exists meetup_dismissals_delete_own on public.meetup_dismissals;
create policy meetup_dismissals_delete_own
  on public.meetup_dismissals
  for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- No UPDATE policy on purpose. The row is (PK, timestamp) and the
-- timestamp shouldn't change after insert; if a camper undismisses
-- + redismisses, the row is deleted + re-inserted.

grant select, insert, delete on table public.meetup_dismissals to authenticated;
