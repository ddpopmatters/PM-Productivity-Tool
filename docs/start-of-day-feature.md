# Start Of Day Feature Contract

## Purpose

The Start Of Day feature turns Hermes' morning automation into a visible Momentum Hub screen and Telegram Mini App target. Hermes generates the packet; Momentum Hub displays it and records whether Dan has seen, started, snoozed, or completed it.

## Supabase Schema

Apply this through the normal Supabase migration flow or database tooling. Do not copy it directly into `supabase/migrations/` without using the project migration process.

```sql
create table if not exists public.start_of_day_packets (
  id uuid primary key default gen_random_uuid(),
  user_email text not null,
  packet_date date not null,
  primary_task text,
  if_you_finish_early text,
  re_entry_prompt text,
  ack_status text not null default 'unseen'
    check (ack_status in ('unseen', 'seen', 'started', 'snoozed', 'done')),
  source text not null default 'hermes',
  generated_at timestamptz not null default now(),
  previous_packet_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_email, packet_date)
);

create table if not exists public.start_of_day_items (
  id uuid primary key default gen_random_uuid(),
  packet_id uuid not null references public.start_of_day_packets(id) on delete cascade,
  item_type text not null check (
    item_type in (
      'forgotten_work',
      'agent_can_do',
      'waiting_on_user',
      'already_started',
      'created_file'
    )
  ),
  title text not null,
  summary text,
  evidence text,
  confidence text,
  next_action text,
  status text not null default 'open'
    check (status in ('open', 'in_progress', 'done', 'dismissed')),
  source_url text,
  local_path text,
  storage_bucket text,
  storage_path text,
  storage_mime_type text,
  storage_file_size bigint,
  storage_uploaded_at timestamptz,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists start_of_day_packets_user_date_idx
  on public.start_of_day_packets(user_email, packet_date desc);

create index if not exists start_of_day_items_packet_type_idx
  on public.start_of_day_items(packet_id, item_type, sort_order);

create index if not exists start_of_day_items_storage_path_idx
  on public.start_of_day_items(storage_bucket, storage_path)
  where storage_path is not null;

insert into storage.buckets (id, name, public, file_size_limit)
values ('start-of-day-files', 'start-of-day-files', false, 52428800)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit;

alter table public.start_of_day_packets enable row level security;
alter table public.start_of_day_items enable row level security;

create policy "Users can read their own start of day packets"
  on public.start_of_day_packets
  for select
  using (user_email = auth.jwt() ->> 'email');

create policy "Users can update their own packet acknowledgement"
  on public.start_of_day_packets
  for update
  using (user_email = auth.jwt() ->> 'email')
  with check (user_email = auth.jwt() ->> 'email');

create policy "Users can read their own start of day items"
  on public.start_of_day_items
  for select
  using (
    exists (
      select 1
      from public.start_of_day_packets p
      where p.id = start_of_day_items.packet_id
        and p.user_email = auth.jwt() ->> 'email'
    )
  );

create policy "start_of_day_files_select_own_current_folder"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'start-of-day-files'
    and (storage.foldername(name))[1] = 'current'
    and (storage.foldername(name))[2] = lower(
      regexp_replace(coalesce((select auth.jwt() ->> 'email'), ''), '[^a-zA-Z0-9._-]+', '_', 'g')
    )
  );
```

## Hermes Packet Generation

Hermes should generate one packet per user per day and upsert by `(user_email, packet_date)`.

Minimum packet:

```json
{
  "user_email": "dan@example.org",
  "packet_date": "2026-06-15",
  "primary_task": "Open the overdue appeal review and decide the next action.",
  "if_you_finish_early": "Ask Hermes to clear the three high-confidence follow-up items.",
  "re_entry_prompt": "You were last trying to finish the appeal review. Open that first."
}
```

Items should use `item_type` to control where they appear in the UI:

- `forgotten_work`: started work with evidence of interruption or no recent completion.
- `created_file`: human-facing files created by Hermes since the previous packet. Hermes should upload each existing local file to the private `start-of-day-files` bucket and set `storage_bucket`, `storage_path`, `storage_mime_type`, `storage_file_size`, and `storage_uploaded_at`.
- `agent_can_do`: jobs Hermes can complete without Dan's input.
- `waiting_on_user`: decisions, credentials, or approvals Hermes needs from Dan.
- `already_started`: active jobs or automations that should not be duplicated.

### Created File Retention

Hermes manages the `start-of-day-files` bucket as a daily replacement cache, not as an archive. Before inserting a new packet it should delete every object under:

```text
current/<safe-user-email>/
```

It then uploads the current packet's human-facing `created_file` documents back into that folder. This keeps the Momentum Hub `Open File` button usable from the browser while preventing Supabase Storage from filling up with old morning-packet copies. Local paths can remain on rows as a Mac bridge fallback, but the web app should prefer the signed Supabase URL when `storage_path` is present.

## Telegram Mini App Setup

Use the direct deployed Momentum Hub HTTPS URL as the Telegram Mini App URL with the Start Of Day query route:

```text
https://ddpopmatters.github.io/PM-Productivity-Tool/?start=start-of-day
```

The branded `https://populationmatters.org/workstream-tool/` page currently embeds GitHub Pages in an iframe and does not pass parent query parameters into the iframe, so `?start=start-of-day` on the WordPress URL will still open the default app screen. Update the WordPress iframe source or wrapper script before switching Hermes back to the branded URL.

Hermes Telegram cron messages can attach the Mini App as an inline web-app button by setting `telegram_web_app_button` on the cron job. Telegram identity validation should be added server-side before using Telegram `initData` as authentication.
