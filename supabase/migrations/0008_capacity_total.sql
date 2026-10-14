-- ============================================================================
--  gym-buddy : 모집 인원을 "총 인원(글쓴이 포함)" 으로 (0008_capacity_total.sql)
--
--  0007_post_join.sql 을 실행한 뒤에 실행하세요.
--
--  "2명 구해요" 가 총 2명인지 나 말고 2명인지 헷갈려서, 글쓴이를 포함한
--  총 인원으로 세기로 했습니다. (풋살 6명 · 농구 5명처럼 종목에 정해진 수)
--
--  0007 을 처음 버전으로 실행했다면 DB 는 옛 방식(모집할 사람 수)으로 남아 있고,
--  고친 0007 을 실행하다 멈췄다면 일부만 적용돼 있을 수 있습니다.
--  그래서 이 파일은 **몇 번을 실행해도 같은 결과**가 되도록 썼습니다.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. 0007 이 중간에 멈춘 경우를 대비해 빠진 것부터 채웁니다
-- ---------------------------------------------------------------------------
alter table public.posts add column if not exists capacity          int;
alter table public.posts add column if not exists participant_count int not null default 0;

create table if not exists public.post_participants (
  post_id    bigint not null references public.posts(id)    on delete cascade,
  user_id    uuid   not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create index if not exists post_participants_user_id_idx
  on public.post_participants (user_id);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'posts_capacity_only_workout'
  ) then
    alter table public.posts
      add co nstraint posts_capacity_only_workout check (board = 'workout' or capacity is null);
  end if;
end
$$;


-- ---------------------------------------------------------------------------
-- 2. 총 인원은 최소 2 (글쓴이 혼자면 모임이 아님)
--    컬럼에 붙은 기존 check 를 떼고 다시 붙입니다.
-- ---------------------------------------------------------------------------
alter table public.posts drop constraint if exists posts_capacity_check;
alter table public.posts
  add constraint posts_capacity_check check (capacity is null or capacity between 2 and 20);


-- ---------------------------------------------------------------------------
-- 3. 인원 수 갱신 트리거 · 헬퍼 (없으면 만들고, 있으면 그대로 덮어씁니다)
-- ---------------------------------------------------------------------------
create or replace function public.bump_participant_count()
returns trigger language plpgsql security definer set search_path = public
as $fn$
declare
  delta  int    := case when tg_op = 'INSERT' then 1 else -1 end;
  target bigint := case when tg_op = 'INSERT' then new.post_id else old.post_id end;
begin
  update public.posts
  set participant_count = greatest(participant_count + delta, 0)
  where id = target;
  return null;
end;
$fn$;

drop trigger if exists trg_participants_count on public.post_participants;
create trigger trg_participants_count
  after insert or delete on public.post_participants
  for each row execute function public.bump_participant_count();

create or replace function public.post_participant_count(p bigint)
returns int
language sql stable security definer set search_path = public
as $fn$
  select count(*)::int from public.post_participants where post_id = p;
$fn$;


-- ---------------------------------------------------------------------------
-- 4. RLS — 정원 검사를 "참여자 + 글쓴이 1명 < 총 인원" 으로
--    (옛 식은 글쓴이를 안 세서 총 2명짜리에 3명이 들어갔습니다)
-- ---------------------------------------------------------------------------
alter table public.post_participants enable row level security;

drop policy if exists participants_select on public.post_participants;
create policy participants_select on public.post_participants for select to authenticated
  using (public.can_view_post(post_id) and not public.is_blocked(user_id));

drop policy if exists participants_insert on public.post_participants;
create policy participants_insert on public.post_participants for insert to authenticated
  with check (
    user_id = auth.uid()
    and public.can_view_post(post_id)
    and exists (
      select 1 from public.posts p
      where p.id = post_id
        and p.capacity is not null      -- 모집글만
        and p.author_id <> auth.uid()   -- 자기 글에는 참여하지 않음 (주최자)
    )
    and public.post_participant_count(post_id) + 1
        < (select capacity from public.posts where id = post_id)
  );

drop policy if exists participants_delete on public.post_participants;
create policy participants_delete on public.post_participants for delete to authenticated
  using (user_id = auth.uid());


-- ---------------------------------------------------------------------------
-- 5. 조회 RPC — 글쓴이를 포함한 현재 인원(joined_count)을 함께 돌려줍니다
-- ---------------------------------------------------------------------------
drop function if exists public.get_posts(board_type, text, bigint, int);
drop function if exists public.get_post(bigint);

create function public.get_posts(
  board_filter board_type,
  sport_filter text   default null,
  before_id    bigint default null,
  limit_count  int    default 20
)
returns table (
  id                bigint,
  board             board_type,
  sport             text,
  author_id         uuid,
  author_nickname   text,
  title             text,
  body              text,
  image_urls        text[],
  price             int,
  trade_status      trade_status,
  capacity          int,
  participant_count int,
  -- 글쓴이를 포함한 현재 인원. 모집글이 아니면 0
  joined_count      int,
  joined_by_me      boolean,
  like_count        int,
  comment_count     int,
  liked_by_me       boolean,
  is_mine           boolean,
  created_at        timestamptz,
  updated_at        timestamptz
)
language sql stable security definer set search_path = public
as $fn$
  select p.id, p.board, p.sport, p.author_id, pr.nickname, p.title, p.body, p.image_urls,
         p.price, p.trade_status, p.capacity, p.participant_count,
         case when p.capacity is null then 0 else p.participant_count + 1 end,
         exists (select 1 from public.post_participants j where j.post_id = p.id and j.user_id = auth.uid()),
         p.like_count, p.comment_count,
         exists (select 1 from public.post_likes l where l.post_id = p.id and l.user_id = auth.uid()),
         p.author_id = auth.uid(),
         p.created_at, p.updated_at
  from public.posts p
  join public.profiles pr on pr.id = p.author_id
  where p.university = public.my_university()
    and p.board = board_filter
    and (sport_filter is null or p.sport = sport_filter)
    and not public.is_blocked(p.author_id)
    and (before_id is null or p.id < before_id)
  order by p.id desc
  limit least(limit_count, 50);
$fn$;

create function public.get_post(p_post_id bigint)
returns table (
  id                bigint,
  board             board_type,
  sport             text,
  author_id         uuid,
  author_nickname   text,
  title             text,
  body              text,
  image_urls        text[],
  price             int,
  trade_status      trade_status,
  capacity          int,
  participant_count int,
  -- 글쓴이를 포함한 현재 인원. 모집글이 아니면 0
  joined_count      int,
  joined_by_me      boolean,
  like_count        int,
  comment_count     int,
  liked_by_me       boolean,
  is_mine           boolean,
  created_at        timestamptz,
  updated_at        timestamptz
)
language sql stable security definer set search_path = public
as $fn$
  select p.id, p.board, p.sport, p.author_id, pr.nickname, p.title, p.body, p.image_urls,
         p.price, p.trade_status, p.capacity, p.participant_count,
         case when p.capacity is null then 0 else p.participant_count + 1 end,
         exists (select 1 from public.post_participants j where j.post_id = p.id and j.user_id = auth.uid()),
         p.like_count, p.comment_count,
         exists (select 1 from public.post_likes l where l.post_id = p.id and l.user_id = auth.uid()),
         p.author_id = auth.uid(),
         p.created_at, p.updated_at
  from public.posts p
  join public.profiles pr on pr.id = p.author_id
  where p.id = p_post_id
    and p.university = public.my_university()
    and not public.is_blocked(p.author_id);
$fn$;

create or replace function public.get_post_participants(p_post_id bigint)
returns table (
  user_id    uuid,
  nickname   text,
  avatar_url text,
  joined_at  timestamptz
)
language sql stable security definer set search_path = public
as $fn$
  select j.user_id, pr.nickname, pr.avatar_url, j.created_at
  from public.post_participants j
  join public.profiles pr on pr.id = j.user_id
  where j.post_id = p_post_id
    and public.can_view_post(p_post_id)
    and not public.is_blocked(j.user_id)
  order by j.created_at;
$fn$;

-- API 가 바뀐 함수를 바로 알아보도록 스키마 캐시 새로고침
notify pgrst, 'reload schema';
