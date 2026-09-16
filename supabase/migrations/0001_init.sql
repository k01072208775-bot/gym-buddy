-- ============================================================================
--  gym-buddy : 초기 스키마 (0001_init.sql)
--  Supabase 대시보드 > SQL Editor 에 통째로 붙여넣고 Run 하세요.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. ENUM 타입
-- ---------------------------------------------------------------------------
create type gender           as enum ('male', 'female', 'other');
create type experience_level as enum ('beginner', 'intermediate', 'advanced');
create type swipe_action     as enum ('like', 'pass');
create type report_status    as enum ('pending', 'reviewing', 'resolved', 'dismissed');


-- ---------------------------------------------------------------------------
-- 2. 테이블
-- ---------------------------------------------------------------------------

-- 2-1. 프로필 : auth.users 와 1:1
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  nickname    text not null check (char_length(nickname) between 2 and 12),
  university  text not null,
  gender      gender not null,
  birth_year  int  not null check (birth_year between 1950 and 2012),
  bio         text check (char_length(bio) <= 300),
  avatar_url  text,
  verified_at timestamptz,                       -- 학교 이메일 인증 완료 시각
  is_active   boolean not null default true,     -- false = 탐색 후보에서 숨김
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 2-2. 운동 취향 + 매칭 선호 조건
create table public.workout_prefs (
  user_id                uuid primary key references public.profiles(id) on delete cascade,
  sports                 text[] not null default '{}',   -- 예: {헬스,러닝,클라이밍}
  gym_name               text,                           -- 주로 가는 헬스장
  time_slots             text[] not null default '{}',   -- 예: {평일오전,평일저녁,주말}
  experience             experience_level not null default 'beginner',
  goal                   text,                           -- 벌크업 / 다이어트 / 대회준비
  prefer_same_university boolean not null default true,
  prefer_gender          gender[] not null default '{}', -- 빈 배열 = 성별 무관
  updated_at             timestamptz not null default now(),
  check (cardinality(sports)     <= 10),
  check (cardinality(time_slots) <= 10)
);

-- 2-3. 좋아요 / 패스 기록
create table public.swipes (
  id         bigint generated always as identity primary key,
  from_user  uuid not null references public.profiles(id) on delete cascade,
  to_user    uuid not null references public.profiles(id) on delete cascade,
  action     swipe_action not null,
  created_at timestamptz not null default now(),
  unique (from_user, to_user),
  check (from_user <> to_user)
);

-- 2-4. 매칭 성사
--      user_a < user_b 로 정렬해 저장 → (A,B)/(B,A) 중복 매칭을 원천 차단
create table public.matches (
  id         bigint generated always as identity primary key,
  user_a     uuid not null references public.profiles(id) on delete cascade,
  user_b     uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_a, user_b),
  check (user_a < user_b)
);

-- 2-5. 메시지
create table public.messages (
  id         bigint generated always as identity primary key,
  match_id   bigint not null references public.matches(id)  on delete cascade,
  sender_id  uuid   not null references public.profiles(id) on delete cascade,
  body       text   not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);

-- 2-6. 차단   ★ 앱스토어 심사 필수 항목
create table public.blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

-- 2-7. 신고   ★ 앱스토어 심사 필수 항목
create table public.reports (
  id          bigint generated always as identity primary key,
  reporter_id uuid references public.profiles(id) on delete set null,
  target_id   uuid not null references public.profiles(id) on delete cascade,
  reason      text not null,          -- harassment | fake_profile | spam | other
  detail      text check (char_length(detail) <= 1000),
  status      report_status not null default 'pending',
  created_at  timestamptz not null default now()
);


-- ---------------------------------------------------------------------------
-- 3. 인덱스
-- ---------------------------------------------------------------------------
create index on public.profiles      (university) where is_active;
create index on public.swipes        (from_user);
create index on public.swipes        (to_user);
create index on public.matches       (user_a);
create index on public.matches       (user_b);
create index on public.messages      (match_id, created_at desc);
create index on public.reports       (status) where status = 'pending';
create index on public.workout_prefs using gin (sports);
create index on public.workout_prefs using gin (time_slots);


-- ---------------------------------------------------------------------------
-- 4. 헬퍼 함수
--    security definer = RLS를 우회해 실행. 정책 안에서 무한 재귀를 피하려면 필수.
-- ---------------------------------------------------------------------------

-- 4-1. 나와 상대가 (어느 방향으로든) 차단 관계인가?
create or replace function public.is_blocked(other uuid)
returns boolean
language sql stable security definer set search_path = public
as $fn$
  select exists (
    select 1 from public.blocks
    where (blocker_id = auth.uid() and blocked_id = other)
       or (blocker_id = other       and blocked_id = auth.uid())
  );
$fn$;

-- 4-2. 내가 이 매칭의 당사자인가?
create or replace function public.is_match_member(m bigint)
returns boolean
language sql stable security definer set search_path = public
as $fn$
  select exists (
    select 1 from public.matches
    where id = m and (user_a = auth.uid() or user_b = auth.uid())
  );
$fn$;

-- 4-3. updated_at 자동 갱신
create or replace function public.touch_updated_at()
returns trigger language plpgsql
as $fn$
begin
  new.updated_at := now();
  return new;
end;
$fn$;

create trigger trg_profiles_touch      before update on public.profiles
  for each row execute function public.touch_updated_at();
create trigger trg_workout_prefs_touch before update on public.workout_prefs
  for each row execute function public.touch_updated_at();

-- 4-4. 서로 like 하면 matches 자동 생성
create or replace function public.handle_mutual_like()
returns trigger language plpgsql security definer set search_path = public
as $fn$
begin
  if new.action = 'like' and exists (
    select 1 from public.swipes s
    where s.from_user = new.to_user
      and s.to_user   = new.from_user
      and s.action    = 'like'
  ) then
    insert into public.matches (user_a, user_b)
    values (least(new.from_user, new.to_user), greatest(new.from_user, new.to_user))
    on conflict do nothing;
  end if;
  return new;
end;
$fn$;

create trigger trg_swipe_mutual_like
  after insert on public.swipes
  for each row execute function public.handle_mutual_like();


-- ---------------------------------------------------------------------------
-- 5. RLS (Row Level Security)
--    ★★★ 이걸 켜지 않으면 앱에 박힌 anon key로 전 회원 정보가 그대로 털립니다
-- ---------------------------------------------------------------------------
alter table public.profiles      enable row level security;
alter table public.workout_prefs enable row level security;
alter table public.swipes        enable row level security;
alter table public.matches       enable row level security;
alter table public.messages      enable row level security;
alter table public.blocks        enable row level security;
alter table public.reports       enable row level security;

-- 5-1. profiles : 내 것 + (활성 & 차단관계 아닌) 남의 것만
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or (is_active and not public.is_blocked(id)));
create policy profiles_insert on public.profiles for insert to authenticated
  with check (id = auth.uid());
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- 5-2. workout_prefs
create policy prefs_select on public.workout_prefs for select to authenticated
  using (user_id = auth.uid() or not public.is_blocked(user_id));
create policy prefs_insert on public.workout_prefs for insert to authenticated
  with check (user_id = auth.uid());
create policy prefs_update on public.workout_prefs for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 5-3. swipes : 내가 한 것만 조회 (누가 나를 pass 했는지는 절대 노출 금지)
create policy swipes_select on public.swipes for select to authenticated
  using (from_user = auth.uid());
create policy swipes_insert on public.swipes for insert to authenticated
  with check (from_user = auth.uid() and not public.is_blocked(to_user));

-- 5-4. matches : 당사자만. INSERT 정책이 없다 = 오직 트리거로만 생성됨
create policy matches_select on public.matches for select to authenticated
  using (user_a = auth.uid() or user_b = auth.uid());
create policy matches_delete on public.matches for delete to authenticated
  using (user_a = auth.uid() or user_b = auth.uid());

-- 5-5. messages : 내가 속한 매칭의 메시지만
create policy messages_select on public.messages for select to authenticated
  using (public.is_match_member(match_id));
create policy messages_insert on public.messages for insert to authenticated
  with check (sender_id = auth.uid() and public.is_match_member(match_id));

-- 5-6. blocks
create policy blocks_select on public.blocks for select to authenticated
  using (blocker_id = auth.uid());
create policy blocks_insert on public.blocks for insert to authenticated
  with check (blocker_id = auth.uid());
create policy blocks_delete on public.blocks for delete to authenticated
  using (blocker_id = auth.uid());

-- 5-7. reports : 넣기만 가능, 내 신고만 조회. 처리는 관리자(service_role)가.
create policy reports_select on public.reports for select to authenticated
  using (reporter_id = auth.uid());
create policy reports_insert on public.reports for insert to authenticated
  with check (reporter_id = auth.uid());


-- ---------------------------------------------------------------------------
-- 6. 후보 탐색 RPC
--    차단·이미 스와이프한 사람 제외 + 겹치는 종목/시간대가 많은 순으로 정렬
-- ---------------------------------------------------------------------------
create or replace function public.get_candidates(limit_count int default 20)
returns table (
  id            uuid,
  nickname      text,
  university    text,
  gender        gender,
  birth_year    int,
  bio           text,
  avatar_url    text,
  sports        text[],
  gym_name      text,
  time_slots    text[],
  experience    experience_level,
  shared_sports int,
  shared_slots  int
)
language sql stable security definer set search_path = public
as $fn$
  with me as (
    select p.id, p.university, wp.sports, wp.time_slots,
           wp.prefer_same_university, wp.prefer_gender
    from public.profiles p
    join public.workout_prefs wp on wp.user_id = p.id
    where p.id = auth.uid()
  )
  select p.id, p.nickname, p.university, p.gender, p.birth_year, p.bio, p.avatar_url,
         wp.sports, wp.gym_name, wp.time_slots, wp.experience,
         cardinality(array(select unnest(wp.sports)     intersect select unnest(me.sports)))::int,
         cardinality(array(select unnest(wp.time_slots) intersect select unnest(me.time_slots)))::int
  from public.profiles p
  join public.workout_prefs wp on wp.user_id = p.id
  cross join me
  where p.id <> me.id
    and p.is_active
    and not public.is_blocked(p.id)
    and not exists (
      select 1 from public.swipes s
      where s.from_user = me.id and s.to_user = p.id
    )
    and (not me.prefer_same_university or p.university = me.university)
    and (cardinality(me.prefer_gender) = 0 or p.gender = any(me.prefer_gender))
  order by 12 desc, 13 desc, p.created_at desc
  limit least(limit_count, 50);
$fn$;


-- ---------------------------------------------------------------------------
-- 7. 프로필 사진 저장소
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- 파일 경로 규칙: avatars/<user_id>/<파일명>  → 자기 폴더에만 쓰기 가능
create policy avatars_read on storage.objects for select
  using (bucket_id = 'avatars');
create policy avatars_write on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy avatars_update on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy avatars_delete on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);


-- ---------------------------------------------------------------------------
-- 8. 채팅 실시간 구독 활성화
-- ---------------------------------------------------------------------------
do $do$
begin
  alter publication supabase_realtime add table public.messages;
exception when duplicate_object then null;
end;
$do$;
