do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'rooms'
      and policyname = 'rooms can be deleted by client app'
  ) then
    create policy "rooms can be deleted by client app" on rooms for delete using (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'participants'
      and policyname = 'participants deletable by client app'
  ) then
    create policy "participants deletable by client app" on participants for delete using (true);
  end if;
end $$;
