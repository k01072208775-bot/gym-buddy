-- ============================================================================
--  gym-buddy : 안 읽은 메시지 (0009_message_reads.sql)
--
--  0008_capacity_total.sql 까지 실행한 뒤에 실행하세요.
--
--  지금은 상대가 메시지를 보내도 알 방법이 없어서 대화방을 하나씩 열어봐야
--  합니다. 매칭 목록에 마지막 메시지와 안 읽은 개수를 보여줍니다.
--
--  "어디까지 읽었는가" 를 메시지마다 기록하면 사람 수 x 메시지 수만큼 행이
--  쌓입니다. 대화방마다 "마지막으로 읽은 시각" 한 줄만 두면 충분합니다.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. 어디까지 읽었는지
-- ---------------------------------------------------------------------------
create table if not exists public.message_reads (
  match_id     bigint not null references public.matches(id)   on delete cascade,
  user_id      uuid   not null references public.profiles(id)  on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (match_id, user_id)
);

alter table public.message_reads enable row level security;

-- 내 읽음 기록만. 상대가 내 글을 읽었는지는 노출하지 않습니다
-- (읽씹 여부가 보이면 부담이 되고, 지금 단계에서 필요하지도 않습니다)
drop policy if exists message_reads_select on public.message_reads;
create policy message_reads_select on public.message_reads for select to authenticated
  using (user_id = auth.uid());

drop policy if exists message_reads_upsert on public.message_reads;
create policy message_reads_upsert on public.message_reads for insert to authenticated
  with check (user_id = auth.uid() and public.is_match_member(match_id));

drop policy if exists message_reads_update on public.message_reads;
create policy message_reads_update on public.message_reads for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());


-- ---------------------------------------------------------------------------
-- 2. 대화방을 열었을 때 읽음 처리
-- ---------------------------------------------------------------------------
create or replace function public.mark_match_read(p_match_id bigint)
returns void
language plpgsql security definer set search_path = public
as $fn$
begin
  if not public.is_match_member(p_match_id) then
    raise exception '이 대화방의 참여자가 아닙니다.';
  end if;

  insert into public.message_reads (match_id, user_id, last_read_at)
  values (p_match_id, auth.uid(), now())
  on conflict (match_id, user_id)
  do update set last_read_at = now();
end;
$fn$;


-- ---------------------------------------------------------------------------
-- 3. 매칭 목록 + 마지막 메시지 + 안 읽은 개수
--    전에는 앱이 matches 와 profiles 를 따로 불러 합쳤습니다. 거기에 대화방마다
--    메시지까지 물으면 요청이 대화방 수만큼 늘어나므로 DB 에서 한 번에 만듭니다.
-- ---------------------------------------------------------------------------
create or replace function public.get_matches()
returns table (
  match_id             bigint,
  matched_at           timestamptz,
  partner_id           uuid,
  partner_nickname     text,
  partner_university   text,
  partner_avatar_url   text,
  last_message         text,
  last_message_at      timestamptz,
  last_message_is_mine boolean,
  unread_count         int
)
language sql stable security definer set search_path = public
as $fn$
  with mine as (
    select m.id,
           m.created_at,
           case when m.user_a = auth.uid() then m.user_b else m.user_a end as partner_id
    from public.matches m
    where auth.uid() in (m.user_a, m.user_b)
  )
  select mine.id,
         mine.created_at,
         pr.id, pr.nickname, pr.university, pr.avatar_url,
         last_msg.body,
         last_msg.created_at,
         last_msg.sender_id = auth.uid(),
         (
           select count(*)::int
           from public.messages msg
           where msg.match_id = mine.id
             and msg.sender_id <> auth.uid()
             and msg.created_at > coalesce(reads.last_read_at, '-infinity'::timestamptz)
         )
  from mine
  -- 상대가 탈퇴했거나 차단되어 프로필이 보이지 않으면 목록에서 빠집니다
  join public.profiles pr on pr.id = mine.partner_id
  left join public.message_reads reads
         on reads.match_id = mine.id and reads.user_id = auth.uid()
  left join lateral (
    select msg.body, msg.created_at, msg.sender_id
    from public.messages msg
    where msg.match_id = mine.id
    order by msg.created_at desc
    limit 1
  ) last_msg on true
  where not public.is_blocked(pr.id)
  -- 대화가 있으면 최근 대화순, 없으면 매칭된 순
  order by coalesce(last_msg.created_at, mine.created_at) desc;
$fn$;

-- 안 읽은 개수를 셀 때 쓰는 조회 순서
create index if not exists messages_match_created_idx
  on public.messages (match_id, created_at desc);

-- API 가 새 함수를 바로 알아보도록 스키마 캐시 새로고침
notify pgrst, 'reload schema';
