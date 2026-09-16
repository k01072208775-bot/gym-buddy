-- ============================================================================
--  gym-buddy : 게시글 사진 첨부 (0005_post_images.sql)
--
--  0004_post_sport.sql 까지 실행한 뒤에 실행하세요.
--  글에 사진을 최대 4장까지 붙입니다. 특히 장터 글은 사진이 없으면 잘 안 팔립니다.
--
--  사진 파일 자체는 post-images 버킷에 올라가고, posts 에는 공개 URL 만 담습니다.
--  글을 저장하기 전에 사진을 먼저 올리므로 경로에 글 id 를 쓸 수 없어
--  avatars 와 같은 <user_id>/<파일명> 규칙을 씁니다.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. 컬럼
-- ---------------------------------------------------------------------------
alter table public.posts
  add column image_urls text[] not null default '{}';

-- 한 글에 4장까지. (빈 배열이면 array_length 가 null 이라 따로 통과시킵니다)
alter table public.posts
  add constraint posts_image_urls_max check (
    array_length(image_urls, 1) is null or array_length(image_urls, 1) <= 4
  );


-- ---------------------------------------------------------------------------
-- 2. 스토리지 버킷
--    경로 규칙: post-images/<user_id>/<파일명>  → 자기 폴더에만 쓰기 가능
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('post-images', 'post-images', true)
on conflict (id) do nothing;

create policy post_images_read on storage.objects for select
  using (bucket_id = 'post-images');
create policy post_images_write on storage.objects for insert to authenticated
  with check (bucket_id = 'post-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy post_images_update on storage.objects for update to authenticated
  using (bucket_id = 'post-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy post_images_delete on storage.objects for delete to authenticated
  using (bucket_id = 'post-images' and (storage.foldername(name))[1] = auth.uid()::text);


-- ---------------------------------------------------------------------------
-- 3. 조회 RPC 교체
--    돌려주는 컬럼이 바뀌면 create or replace 가 안 되므로 지우고 다시 만듭니다.
-- ---------------------------------------------------------------------------
drop function if exists public.get_posts(board_type, text, bigint, int);
drop function if exists public.get_post(bigint);

-- 3-1. 글 목록. sport_filter 가 null 이면 전체 종목
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
  image_urls      text[],
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
  select p.id, p.board, p.sport, p.author_id, pr.nickname, p.title, p.body, p.image_urls,
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

-- 3-2. 글 하나
create function public.get_post(p_post_id bigint)
returns table (
  id              bigint,
  board           board_type,
  sport           text,
  author_id       uuid,
  author_nickname text,
  title           text,
  body            text,
  image_urls      text[],
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
  select p.id, p.board, p.sport, p.author_id, pr.nickname, p.title, p.body, p.image_urls,
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
