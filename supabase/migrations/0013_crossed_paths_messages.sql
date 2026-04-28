-- ============================================================================
-- 0013_crossed_paths_messages.sql
-- Private two-way messaging tied to a crossed_paths pair. One conversation
-- per crossed_paths row. RLS lets only the two participants SELECT/INSERT
-- their messages — nobody else, ever.
-- ============================================================================

create table if not exists public.crossed_paths_messages (
  id uuid primary key default gen_random_uuid(),
  crossed_path_id uuid not null references public.crossed_paths(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists crossed_paths_messages_thread_idx
  on public.crossed_paths_messages (crossed_path_id, created_at);

alter table public.crossed_paths_messages enable row level security;

-- SELECT: visible only to the two campers in the parent crossed_paths row.
drop policy if exists crossed_paths_messages_select_participants
  on public.crossed_paths_messages;
create policy crossed_paths_messages_select_participants
  on public.crossed_paths_messages for select
  to authenticated
  using (
    exists (
      select 1 from public.crossed_paths cp
       where cp.id = crossed_path_id
         and ((select auth.uid()) in (cp.profile_a_id, cp.profile_b_id))
    )
  );

-- INSERT: caller must be a participant AND must set sender_id to themselves.
drop policy if exists crossed_paths_messages_insert_self
  on public.crossed_paths_messages;
create policy crossed_paths_messages_insert_self
  on public.crossed_paths_messages for insert
  to authenticated
  with check (
    sender_id = (select auth.uid())
    and exists (
      select 1 from public.crossed_paths cp
       where cp.id = crossed_path_id
         and ((select auth.uid()) in (cp.profile_a_id, cp.profile_b_id))
    )
  );

-- DELETE: a sender can delete their own message (rare path, keeps moderation
-- self-service).
drop policy if exists crossed_paths_messages_delete_own
  on public.crossed_paths_messages;
create policy crossed_paths_messages_delete_own
  on public.crossed_paths_messages for delete
  to authenticated
  using (sender_id = (select auth.uid()));
