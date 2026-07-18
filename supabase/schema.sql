create extension if not exists pgcrypto;

create table if not exists rooms (
  id uuid primary key default gen_random_uuid(),
  code text unique not null check (code ~ '^[0-9]{6}$'),
  title text not null,
  host_name text not null,
  admin_pin text not null check (admin_pin ~ '^[0-9]{4,6}$'),
  default_time_limit integer not null default 30,
  use_ranking boolean not null default true,
  points_per_correct integer not null default 100,
  use_speed_bonus boolean not null default true,
  max_participants integer not null default 100,
  allow_answer_changes boolean not null default false,
  current_question_index integer not null default 0,
  status text not null default 'waiting' check (status in ('waiting','question','answering','closed','revealed','ranking','finished')),
  phase_started_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists participants (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  name text not null,
  joined_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  connected boolean not null default true
);

create unique index if not exists participants_room_name_unique
  on participants (room_id, lower(name));

create table if not exists questions (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  prompt text not null,
  note text,
  type text not null check (type in ('multiple4','multiple2','truefalse','text')),
  options jsonb not null default '[]'::jsonb,
  correct_answer text not null,
  explanation text,
  time_limit integer not null default 30,
  points integer not null default 100,
  order_index integer not null default 0,
  image_url text,
  draft boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists answers (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  question_id uuid not null references questions(id) on delete cascade,
  participant_id uuid not null references participants(id) on delete cascade,
  answer text not null,
  answered_at timestamptz not null default now(),
  elapsed_ms integer not null default 0,
  is_correct boolean not null default false,
  points_awarded integer not null default 0,
  unique (question_id, participant_id)
);

create table if not exists app_settings (
  id text primary key default 'global' check (id = 'global'),
  home_eyebrow text not null default '豊見城３班　眞喜志運営',
  home_title text not null default 'みんなでクイズ',
  home_description text not null default '出題者が問題を進めると、参加者の画面も同時に切り替わります。登録なしで、簡単に参加できます！',
  home_host_button text not null default 'クイズを開催する',
  home_join_button text not null default 'クイズに参加する',
  home_join_title text not null default 'クイズに参加',
  home_code_label text not null default '参加コード',
  home_name_label text not null default '表示名',
  home_join_submit text not null default '参加する',
  home_join_note text not null default 'QRコードを読み取った場合も、この画面から名前だけで参加できます。',
  access_passphrase_hash text not null default '',
  updated_at timestamptz not null default now()
);

alter publication supabase_realtime add table rooms;
alter publication supabase_realtime add table participants;
alter publication supabase_realtime add table questions;
alter publication supabase_realtime add table answers;
alter publication supabase_realtime add table app_settings;

alter table rooms enable row level security;
alter table participants enable row level security;
alter table questions enable row level security;
alter table answers enable row level security;
alter table app_settings enable row level security;

create policy "rooms are readable" on rooms for select using (true);
create policy "rooms can be inserted" on rooms for insert with check (true);
create policy "rooms can be updated by client app" on rooms for update using (true);
create policy "rooms can be deleted by client app" on rooms for delete using (true);

create policy "participants readable" on participants for select using (true);
create policy "participants insertable" on participants for insert with check (true);
create policy "participants deletable by client app" on participants for delete using (true);

create policy "questions readable" on questions for select using (true);
create policy "questions writable" on questions for all using (true) with check (true);

create policy "answers readable" on answers for select using (true);
create policy "answers writable" on answers for all using (true) with check (true);

create policy "app settings readable" on app_settings for select using (true);
create policy "app settings writable" on app_settings for all using (true) with check (true);
