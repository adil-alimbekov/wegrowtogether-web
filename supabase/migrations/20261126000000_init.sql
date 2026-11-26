-- WeGrowTogether: схема по спецификации онбординга (раздел 4).
-- Доступ к данным только через RLS: каждый видит свою семью и свои записи.

create table public.families (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

create table public.family_members (
  family_id uuid not null references public.families on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  role text not null default 'parent' check (role in ('parent', 'caregiver')),
  created_at timestamptz not null default now(),
  primary key (family_id, user_id)
);

create table public.profiles (
  user_id uuid primary key references auth.users on delete cascade,
  family_id uuid references public.families on delete set null,
  display_name text check (char_length(display_name) <= 40),
  lang text not null default 'ru' check (lang in ('ru', 'kg')),
  status text check (status in ('child', 'expecting', 'both')),
  weekday_min int check (weekday_min between 0 and 1440),
  weekend_min int check (weekend_min between 0 and 1440),
  screen_min int check (screen_min between 0 and 1440),
  concerns jsonb not null default '[]',
  caregivers jsonb not null default '[]',
  goals jsonb not null default '[]',
  missing jsonb not null default '[]',
  snoozed_until timestamptz,
  onboarded boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Ребёнок: только имя/псевдоним, месяц и год рождения. Точная дата, фамилия, фото не хранятся.
create table public.children (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 30),
  birth_year int not null check (birth_year between 1990 and 2100),
  birth_month int not null check (birth_month between 1 and 12),
  sex text check (sex in ('male', 'female')),
  traits text check (char_length(traits) <= 300),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.children (family_id);

-- Беременность: только месяц и год ПДР, без медицинских данных.
create table public.pregnancies (
  family_id uuid primary key references public.families on delete cascade,
  due_year int not null check (due_year between 2020 and 2100),
  due_month int not null check (due_month between 1 and 12),
  first_child boolean,
  updated_at timestamptz not null default now()
);

create table public.consents (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users on delete cascade,
  type text not null check (type in ('A', 'B', 'C', 'D', 'E', 'G')),
  version text not null,
  lang text not null,
  given_at timestamptz not null default now(),
  withdrawn_at timestamptz
);
create index on public.consents (user_id);

-- Расшифровка и JSON парсера. Удаляются через 90 дней (cleanup_onboarding_sessions).
create table public.onboarding_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  transcript text check (char_length(transcript) <= 8000),
  parsed jsonb,
  parser text not null default 'local',
  prompt_version text,
  created_at timestamptz not null default now()
);

-- Кризисные события: только тип и время, без цитаты.
create table public.crisis_events (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users on delete cascade,
  flag text not null,
  severity text not null check (severity in ('high', 'medium')),
  shown_at timestamptz not null default now()
);

-- Отклик на рекомендации: «полезно», «сделали», «скрыть».
create table public.tip_feedback (
  user_id uuid not null references auth.users on delete cascade,
  tip_id text not null,
  kind text not null check (kind in ('useful', 'done', 'hide')),
  created_at timestamptz not null default now(),
  primary key (user_id, tip_id)
);

-- ——— доступ ———
create function public.is_member(f uuid) returns boolean
language sql security definer stable set search_path = '' as $$
  select exists (select 1 from public.family_members where family_id = f and user_id = auth.uid())
$$;

alter table public.families enable row level security;
alter table public.family_members enable row level security;
alter table public.profiles enable row level security;
alter table public.children enable row level security;
alter table public.pregnancies enable row level security;
alter table public.consents enable row level security;
alter table public.onboarding_sessions enable row level security;
alter table public.crisis_events enable row level security;
alter table public.tip_feedback enable row level security;

create policy "family: members read" on public.families for select to authenticated using (public.is_member(id));
create policy "members: read own family" on public.family_members for select to authenticated using (user_id = auth.uid() or public.is_member(family_id));
create policy "profiles: own" on public.profiles for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid() and (family_id is null or public.is_member(family_id)));
create policy "children: family" on public.children for all to authenticated using (public.is_member(family_id)) with check (public.is_member(family_id));
create policy "pregnancies: family" on public.pregnancies for all to authenticated using (public.is_member(family_id)) with check (public.is_member(family_id));
create policy "consents: own" on public.consents for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "onboarding: own" on public.onboarding_sessions for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "crisis: insert own" on public.crisis_events for insert to authenticated with check (user_id = auth.uid());
create policy "feedback: own" on public.tip_feedback for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

revoke all on all tables in schema public from anon;
grant select, insert, update, delete on all tables in schema public to authenticated;

-- ——— функции ———
-- Создаёт семью и профиль при первом входе. Возвращает id семьи.
create function public.ensure_family() returns uuid
language plpgsql security definer set search_path = '' as $$
declare fid uuid;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  select family_id into fid from public.family_members where user_id = auth.uid() limit 1;
  if fid is null then
    insert into public.families default values returning id into fid;
    insert into public.family_members (family_id, user_id) values (fid, auth.uid());
  end if;
  insert into public.profiles (user_id, family_id) values (auth.uid(), fid)
    on conflict (user_id) do update set family_id = coalesce(public.profiles.family_id, excluded.family_id);
  return fid;
end $$;

-- «Удалить все данные»: удаляет аккаунт, всё остальное уходит каскадом.
-- Семья удаляется, если в ней не осталось других взрослых.
create function public.delete_my_account() returns void
language plpgsql security definer set search_path = '' as $$
declare fid uuid;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  for fid in select family_id from public.family_members where user_id = auth.uid() loop
    if not exists (select 1 from public.family_members where family_id = fid and user_id <> auth.uid()) then
      delete from public.families where id = fid;
    end if;
  end loop;
  delete from auth.users where id = auth.uid();
end $$;

create function public.cleanup_onboarding_sessions() returns void
language sql security definer set search_path = '' as $$
  delete from public.onboarding_sessions where created_at < now() - interval '90 days'
$$;
-- В облаке Supabase включите pg_cron и запланируйте:
-- select cron.schedule('cleanup-onboarding', '0 3 * * *', 'select public.cleanup_onboarding_sessions()');

revoke execute on function public.cleanup_onboarding_sessions() from public, anon, authenticated;
revoke execute on function public.ensure_family(), public.delete_my_account() from public, anon;
grant execute on function public.ensure_family(), public.delete_my_account() to authenticated;

create function public.touch() returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end $$;
create trigger touch before update on public.profiles for each row execute function public.touch();
create trigger touch before update on public.children for each row execute function public.touch();
create trigger touch before update on public.pregnancies for each row execute function public.touch();
