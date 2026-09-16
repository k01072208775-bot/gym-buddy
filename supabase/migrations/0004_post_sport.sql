-- ============================================================================
--  gym-buddy : 운동게시판 종목 분류 (0004_post_sport.sql)
--
--  0003_boards.sql 을 먼저 실행한 뒤에 실행하세요.
--  운동게시판 글에 종목(축구, 풋살, 헬스 …)을 달고, 목록을 종목별로 걸러 봅니다.
--  종목 목록 자체는 앱의 constants/board.ts 의 WORKOUT_SPORTS 에서 관리합니다.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. 컬럼 · 제약 · 인덱스
-- ---------------------------------------------------------------------------
alter table public.posts
  add column sport text check (char_length(sport) between 1 and 20);

-- 종목은 운동게시판에만. (기존 운동게시판 글은 종목 없이 남아 있어도 됨)
alter table public.posts
  add constraint posts_sport_only_workout check (board = 'workout' or sport is null);

create index on public.posts (university, board, sport, id desc);


-- ---------------------------------------------------------------------------
-- 2. 조회 RPC 교체
--    돌려주는 컬럼이 바뀌면 create or replace 가 안 되므로 지우고 다시 만듭니다.
-- ---------------------------------------------------------------------------
drop function if exists public.get_posts(board_type, bigint, int);
drop function if exists public.get_post(bigint);

-- 2-1. 글 목록. sport_filter 가 null 이면 전체 종목
create function public.get_posts(
  board_filter board_type,
  sport_filter text   default null,
  before_id    bigint default null,
  limit_count  int    default 20
)
returns table (
  id              bigint,
  board           board_type,
  sport           text,
  author_id       uuid,
  author_nickname text,
  title           text,
  body            text,
  price           int,
  trade_status    trade_status,
  like_count      int,
  comment_count   int,
  liked_by_me     boolean,
  is_mine         boolean,
  created_at      timestamptz,
  updated_at      timestamptz
)
language sql stable security definer set search_path = public
as $fn$
  select p.id, p.board, p.sport, p.author_id, pr.nickname, p.title, p.body,
         p.price, p.trade_status, p.like_count, p.comment_count,
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

-- 2-2. 글 하나
create function public.get_post(p_post_id bigint)
returns table (
  id              bigint,
  board           board_type,
  sport           text,
  author_id       uuid,
  author_nickname text,
  title           text,
  body            text,
  price           int,
  trade_status    trade_status,
  like_count      int,
  comment_count   int,
  liked_by_me     boolean,
  is_mine         boolean,
  created_at      timestamptz,
  updated_at      timestamptz
)
language sql stable security definer set search_path = public
as $fn$
  select p.id, p.board, p.sport, p.author_id, pr.nickname, p.title, p.body,
         p.price, p.trade_status, p.like_count, p.comment_count,
         exists (select 1 from public.post_likes l where l.post_id = p.id and l.user_id = auth.uid()),
         p.author_id = auth.uid(),
         p.created_at, p.updated_at
  from public.posts p
  join public.profiles pr on pr.id = p.author_id
  where p.id = p_post_id
    and p.university = public.my_university()
    and not public.is_blocked(p.author_id);
$fn$;

-- API 가 바뀐 함수를 바로 알아보도록 스키마 캐시 새로고침
notify pgrst, 'reload schema';
