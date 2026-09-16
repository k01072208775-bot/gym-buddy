-- ============================================================================
--  gym-buddy : 게시판 (0003_boards.sql)
--
--  0001_init.sql, 0002_competitions.sql 을 먼저 실행한 뒤에 실행하세요.
--
--  ★ 이 스키마의 대전제
--    1) 게시글은 같은 학교 학생에게만 보인다 (학교는 DB가 작성자 프로필에서 복사)
--    2) 차단한 / 나를 차단한 사람의 글·댓글은 서로 보이지 않는다
--    3) 좋아요 수·댓글 수는 앱이 직접 못 바꾼다 (트리거만 변경)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. ENUM 타입
--    게시판을 늘리려면: alter type board_type add value 'study';
--    그 다음 constants/board.ts 의 BOARDS 에도 추가하세요.
-- ---------------------------------------------------------------------------
create type board_type   as enum ('free', 'workout', 'market');
create type trade_status as enum ('selling', 'reserved', 'sold');


-- ---------------------------------------------------------------------------
-- 2. 테이블
-- ---------------------------------------------------------------------------

-- 2-1. 게시글
create table public.posts (
  id            bigint generated always as identity primary key,
  board         board_type not null,
  author_id     uuid not null references public.profiles(id) on delete cascade,
  university    text not null,                  -- 트리거가 작성자 프로필에서 채움
  title         text not null check (char_length(title) between 1 and 60),
  body          text not null check (char_length(body) between 1 and 5000),

  -- 장터 전용. 다른 게시판에서는 반드시 null
  price         int check (price between 0 and 100000000),   -- 원 단위, 0 = 나눔
  trade_status  trade_status,

  like_count    int not null default 0,
  comment_count int not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  check (
    (board = 'market'  and price is not null and trade_status is not null) or
    (board <> 'market' and price is null     and trade_status is null)
  )
);

-- 2-2. 댓글
create table public.post_comments (
  id         bigint generated always as identity primary key,
  post_id    bigint not null references public.posts(id)    on delete cascade,
  author_id  uuid   not null references public.profiles(id) on delete cascade,
  body       text   not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);

-- 2-3. 좋아요
create table public.post_likes (
  post_id    bigint not null references public.posts(id)    on delete cascade,
  user_id    uuid   not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

-- 2-4. 신고 대상에 게시글 / 댓글 추가 (target_id 는 작성자)
alter table public.reports
  add column post_id    bigint references public.posts(id)         on delete set null,
  add column comment_id bigint references public.post_comments(id) on delete set null;


-- ---------------------------------------------------------------------------
-- 3. 인덱스
-- ---------------------------------------------------------------------------
create index on public.posts         (university, board, id desc);
create index on public.posts         (author_id);
create index on public.post_comments (post_id, id);
create index on public.post_likes    (user_id);


-- ---------------------------------------------------------------------------
-- 4. 헬퍼 함수 · 트리거
-- ---------------------------------------------------------------------------

-- 4-1. 내 학교
create or replace function public.my_university()
returns text
language sql stable security definer set search_path = public
as $fn$
  select university from public.profiles where id = auth.uid();
$fn$;

-- 4-2. 내가 이 글을 볼 수 있는가? (같은 학교 + 차단 관계 아님)
create or replace function public.can_view_post(p bigint)
returns boolean
language sql stable security definer set search_path = public
as $fn$
  select exists (
    select 1 from public.posts
    where id = p
      and university = public.my_university()
      and not public.is_blocked(author_id)
  );
$fn$;

-- 4-3. 글 저장 전 정리
--      학교·작성자·게시판·카운트는 앱이 보낸 값을 무시하고 DB가 정합니다.
create or replace function public.prepare_post()
returns trigger language plpgsql security definer set search_path = public
as $fn$
begin
  if tg_op = 'INSERT' then
    new.university    := (select university from public.profiles where id = new.author_id);
    new.like_count    := 0;
    new.comment_count := 0;
    if new.board = 'market' and new.trade_status is null then
      new.trade_status := 'selling';
    end if;
  else
    new.author_id  := old.author_id;
    new.university := old.university;
    new.board      := old.board;
    new.created_at := old.created_at;
    -- 카운트는 아래 4-4 트리거만 바꿀 수 있음 (pg_trigger_depth 로 구분)
    if pg_trigger_depth() = 1 then
      new.like_count    := old.like_count;
      new.comment_count := old.comment_count;
    end if;
    if new.title is distinct from old.title or new.body is distinct from old.body then
      new.updated_at := now();
    end if;
  end if;
  return new;
end;
$fn$;

create trigger trg_posts_prepare
  before insert or update on public.posts
  for each row execute function public.prepare_post();

-- 4-4. 댓글 수 / 좋아요 수 자동 갱신
create or replace function public.bump_post_counts()
returns trigger language plpgsql security definer set search_path = public
as $fn$
declare
  delta int := case when tg_op = 'INSERT' then 1 else -1 end;
  target bigint := case when tg_op = 'INSERT' then new.post_id else old.post_id end;
begin
  if tg_table_name = 'post_comments' then
    update public.posts set comment_count = greatest(comment_count + delta, 0) where id = target;
  else
    update public.posts set like_count    = greatest(like_count + delta, 0)    where id = target;
  end if;
  return null;
end;
$fn$;

create trigger trg_comments_count
  after insert or delete on public.post_comments
  for each row execute function public.bump_post_counts();
create trigger trg_likes_count
  after insert or delete on public.post_likes
  for each row execute function public.bump_post_counts();


-- ---------------------------------------------------------------------------
-- 5. RLS
-- ---------------------------------------------------------------------------
alter table public.posts         enable row level security;
alter table public.post_comments enable row level security;
alter table public.post_likes    enable row level security;

-- 5-1. posts
create policy posts_select on public.posts for select to authenticated
  using (university = public.my_university() and not public.is_blocked(author_id));
create policy posts_insert on public.posts for insert to authenticated
  with check (author_id = auth.uid());
create policy posts_update on public.posts for update to authenticated
  using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy posts_delete on public.posts for delete to authenticated
  using (author_id = auth.uid());

-- 5-2. post_comments : 볼 수 있는 글에만. 수정은 없음 (지우고 다시 쓰기)
create policy comments_select on public.post_comments for select to authenticated
  using (public.can_view_post(post_id) and not public.is_blocked(author_id));
create policy comments_insert on public.post_comments for insert to authenticated
  with check (author_id = auth.uid() and public.can_view_post(post_id));
create policy comments_delete on public.post_comments for delete to authenticated
  using (author_id = auth.uid());

-- 5-3. post_likes : 내 좋아요만 조회 (누가 눌렀는지는 노출하지 않음)
create policy likes_select on public.post_likes for select to authenticated
  using (user_id = auth.uid());
create policy likes_insert on public.post_likes for insert to authenticated
  with check (user_id = auth.uid() and public.can_view_post(post_id));
create policy likes_delete on public.post_likes for delete to authenticated
  using (user_id = auth.uid());


-- ---------------------------------------------------------------------------
-- 6. 조회 RPC
--    작성자 닉네임 · 내가 좋아요 했는지 · 내 글인지를 한 번에 돌려줍니다.
--    보이는 범위(같은 학교 / 차단 제외)는 RLS 와 똑같이 여기서도 걸러냅니다.
-- ---------------------------------------------------------------------------

-- 6-1. 글 목록 (before_id 보다 작은 id 부터 = 무한 스크롤)
create or replace function public.get_posts(
  board_filter board_type,
  before_id    bigint default null,
  limit_count  int    default 20
)
returns table (
  id              bigint,
  board           board_type,
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
  select p.id, p.board, p.author_id, pr.nickname, p.title, p.body,
         p.price, p.trade_status, p.like_count, p.comment_count,
         exists (select 1 from public.post_likes l where l.post_id = p.id and l.user_id = auth.uid()),
         p.author_id = auth.uid(),
         p.created_at, p.updated_at
  from public.posts p
  join public.profiles pr on pr.id = p.author_id
  where p.university = public.my_university()
    and p.board = board_filter
    and not public.is_blocked(p.author_id)
    and (before_id is null or p.id < before_id)
  order by p.id desc
  limit least(limit_count, 50);
$fn$;

-- 6-2. 글 하나
--      (파라미터 이름에 p_ 를 붙인 이유: 결과 컬럼 이름과 겹치면 함수 생성이 실패합니다)
create or replace function public.get_post(p_post_id bigint)
returns table (
  id              bigint,
  board           board_type,
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
  select p.id, p.board, p.author_id, pr.nickname, p.title, p.body,
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

-- 6-3. 댓글 목록
create or replace function public.get_comments(p_post_id bigint)
returns table (
  id              bigint,
  post_id         bigint,
  author_id       uuid,
  author_nickname text,
  body            text,
  is_mine         boolean,
  created_at      timestamptz
)
language sql stable security definer set search_path = public
as $fn$
  select c.id, c.post_id, c.author_id, pr.nickname, c.body,
         c.author_id = auth.uid(), c.created_at
  from public.post_comments c
  join public.profiles pr on pr.id = c.author_id
  where c.post_id = p_post_id
    and public.can_view_post(c.post_id)
    and not public.is_blocked(c.author_id)
  order by c.id asc
  limit 500;
$fn$;
