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

alter table app_settings enable row level security;

drop policy if exists "app settings readable" on app_settings;
drop policy if exists "app settings writable" on app_settings;

create policy "app settings readable" on app_settings for select using (true);
create policy "app settings writable" on app_settings for all using (true) with check (true);

do $$
begin
  alter publication supabase_realtime add table app_settings;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
