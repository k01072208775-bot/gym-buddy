-- ============================================================================
--  gym-buddy : 대회 참가 정원 (0011_tournament_capacity.sql)
--
--  0010_tournaments.sql 까지 실행한 뒤에 실행하세요.
--
--  당구대 수나 진행 시간 때문에 받을 수 있는 인원이 정해져 있습니다.
--  capacity 가 null 이면 제한 없음입니다.
--
--  ★ 정원은 앱 화면만 막아서는 안 됩니다. 운영자가 두 기기에서 동시에 등록하면
--    화면 검사만으로는 정원을 넘길 수 있어 DB 정책에서도 막습니다.
-- ============================================================================

alter table public.tournaments
  add column capacity int check (capacity is null or capacity between 2 and 64);


-- 정책 안에서 tournament_players 를 직접 세면 무한 재귀에 빠지므로 함수로 감쌉니다
create or replace function public.tournament_player_count(t bigint)
returns int
language sql stable security definer set search_path = public
as $fn$
  select count(*)::int from public.tournament_players where tournament_id = t;
$fn$;


-- 참가자 추가 정책을 정원 검사까지 하도록 교체합니다
drop policy if exists players_write on public.tournament_players;
create policy players_write on public.tournament_players for insert to authenticated
  with check (
    public.is_tournament_host(tournament_id)
    and (
      (select capacity from public.tournaments where id = tournament_id) is null
      or public.tournament_player_count(tournament_id)
         < (select capacity from public.tournaments where id = tournament_id)
    )
  );


-- 목록에 정원을 함께 돌려줍니다
drop function if exists public.get_tournaments();

create function public.get_tournaments()
returns table (
  id            bigint,
  title         text,
  sport         text,
  venue         text,
  starts_at     timestamptz,
  status        tournament_status,
  host_nickname text,
  is_host       boolean,
  player_count  int,
  -- null 이면 정원 제한 없음
  capacity      int,
  created_at    timestamptz
)
language sql stable security definer set search_path = public
as $fn$
  select t.id, t.title, t.sport, t.venue, t.starts_at, t.status,
         pr.nickname,
         t.host_id = auth.uid(),
         (select count(*)::int from public.tournament_players p where p.tournament_id = t.id),
         t.capacity,
         t.created_at
  from public.tournaments t
  join public.profiles pr on pr.id = t.host_id
  where t.university = public.my_university()
    -- 준비 중인 대회는 주최자에게만 보입니다
    and (t.status <> 'draft' or t.host_id = auth.uid())
  order by t.created_at desc;
$fn$;

-- API 가 바뀐 함수를 바로 알아보도록 스키마 캐시 새로고침
notify pgrst, 'reload schema';
