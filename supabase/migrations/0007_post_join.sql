-- ============================================================================
--  gym-buddy : 운동 모집글 참여하기 (0007_post_join.sql)
--
--  0006_likes_received.sql 까지 실행한 뒤에 실행하세요.
--
--  탐색 매칭은 두 사람이 서로 수락해야 해서, 가입자가 적을 때는 아무 일도
--  일어나지 않습니다. 운동게시판 글에 모집 인원을 달면 한 사람이 글을 올리는
--  것만으로 모임이 생깁니다. ("내일 저녁 풋살 2명 구해요 1/2")
--
--  글쓴이는 주최자이므로 인원에 포함하지 않고, 자기 글에는 참여할 수 없습니다.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. 컬럼
-- ---------------------------------------------------------------------------
alter table public.posts
  add column capacity          int check (capacity between 1 and 20),
  add column participant_count int not null default 0;

-- 모집 인원은 운동게시판에만. (capacity 가 null 이면 그냥 글, 모집이 아님)
alter table public.posts
  add constraint posts_capacity_only_workout check (board = 'workout' or capacity is null);


-- ---------------------------------------------------------------------------
-- 2. 참여자
-- ---------------------------------------------------------------------------
create table public.post_participants (
  post_id    bigint not null references public.posts(id)    on delete cascade,
  user_id    uuid   not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create index on public.post_participants (user_id);


-- ---------------------------------------------------------------------------
-- 3. 참여 인원 수 자동 갱신
--    앱이 숫자를 직접 못 바꾸게 트리거로만 올리고 내립니다 (좋아요 수와 같은 방식).
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

create trigger trg_participants_count
  after insert or delete on public.post_participants
  for each row execute function public.bump_participant_count();


-- ---------------------------------------------------------------------------
-- 4. 헬퍼
--    RLS 정책 안에서 post_participants 를 직접 조회하면 무한 재귀에 빠지므로
--    security definer 함수로 감싸서 부릅니다 (대회 기능의 active_entry_count 와 같은 이유).
-- ---------------------------------------------------------------------------
create or replace function public.post_participant_count(p bigint)
returns int
language sql stable security definer set search_path = public
as $fn$
  select count(*)::int from public.post_participants where post_id = p;
$fn$;


-- ---------------------------------------------------------------------------
-- 5. RLS
-- ---------------------------------------------------------------------------
alter table public.post_participants enable row level security;

-- 누가 오는지 보고 참여를 정하므로 명단은 글을 볼 수 있는 사람에게 공개합니다.
create policy participants_select on public.post_participants for select to authenticated
  using (public.can_view_post(post_id) and not public.is_blocked(user_id));

-- ★ 정원 초과와 남의 이름으로 참여하는 것을 DB 에서 막습니다.
--   앱만 믿으면 정원 2명짜리에 10명이 들어갈 수 있습니다.
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
    and public.post_participant_count(post_id)
        < (select capacity from public.posts where id = post_id)
  );

create policy participants_delete on public.post_participants for delete to authenticated
  using (user_id = auth.uid());


-- ---------------------------------------------------------------------------
-- 6. 조회 RPC 교체
--    돌려주는 컬럼이 바뀌면 create or replace 가 안 되므로 지우고 다시 만듭니다.
-- ---------------------------------------------------------------------------
drop function if exists public.get_posts(board_type, text, bigint, int);
drop function if exists public.get_post(bigint);

-- 6-1. 글 목록. sport_filter 가 null 이면 전체 종목
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

-- 6-2. 글 하나
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

-- 6-3. 참여자 명단 (차단한 사람은 빼고)
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
