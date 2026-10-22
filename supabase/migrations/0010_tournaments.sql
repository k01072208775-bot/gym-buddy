-- ============================================================================
--  gym-buddy : 토너먼트 (0010_tournaments.sql)
--
--  0009_message_reads.sql 까지 실행한 뒤에 실행하세요.
--
--  팝업 부스에서 여는 당구대회처럼, 현장에서 운영자가 참가자를 받아 대진표를
--  돌리는 용도입니다.
--
--  ★ 0002_competitions.sql 과 왜 따로 두는가
--    0002 는 참가비 · 결제 · 환불 · 상금 정산이 중심이고, 참가 신청에 반드시
--    앱 계정(profiles.id)이 필요합니다. 부스에서는 지나가던 학생이 이름만
--    말하고 바로 참가하므로 그 구조로는 받을 수 없습니다.
--    여기는 돈이 오가지 않는 무료 대회만 다루고, 참가자는 이름만 있으면 됩니다.
--    유료 대회가 필요해지면 그때 0002 를 꺼내 쓰세요 (그쪽은 잠긴 채로 둡니다).
-- ============================================================================

create type tournament_status as enum (
  'draft',     -- 준비 중 (참가자 모으는 단계, 대진표 없음)
  'ongoing',   -- 대진표가 나왔고 경기 중
  'finished'   -- 끝남
);


-- ---------------------------------------------------------------------------
-- 1. 대회
-- ---------------------------------------------------------------------------
create table public.tournaments (
  id         bigint generated always as identity primary key,
  host_id    uuid not null references public.profiles(id) on delete cascade,
  -- 글과 같은 규칙: 같은 학교 학생에게만 보입니다. 트리거가 채웁니다
  university text not null,

  title      text not null check (char_length(title) between 2 and 60),
  sport      text not null check (char_length(sport) between 1 and 20),
  venue      text check (char_length(venue) <= 100),
  starts_at  timestamptz,

  status     tournament_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index on public.tournaments (university, created_at desc);


-- ---------------------------------------------------------------------------
-- 2. 참가자
--    이름만 있으면 됩니다. 앱 계정이 있는 사람은 user_id 를 같이 적어두면
--    나중에 "내가 나간 대회" 를 보여줄 수 있습니다.
-- ---------------------------------------------------------------------------
create table public.tournament_players (
  id            bigint generated always as identity primary key,
  tournament_id bigint not null references public.tournaments(id) on delete cascade,

  name          text not null check (char_length(name) between 1 and 20),
  user_id       uuid references public.profiles(id) on delete set null,

  created_at    timestamptz not null default now(),

  -- 같은 대회에 같은 사람이 두 번 들어가지 않도록 (계정이 있는 경우에 한해)
  unique (tournament_id, user_id)
);

create index on public.tournament_players (tournament_id, id);


-- ---------------------------------------------------------------------------
-- 3. 경기
--    round 1 이 첫 판, 숫자가 커질수록 결승에 가까워집니다.
--    slot 은 그 라운드 안에서의 순번(1번 경기, 2번 경기 …).
--    player_a / player_b 가 null 이면 아직 이전 라운드가 안 끝난 자리이고,
--    한쪽만 null 이면 부전승입니다.
-- ---------------------------------------------------------------------------
create table public.tournament_matches (
  id            bigint generated always as identity primary key,
  tournament_id bigint not null references public.tournaments(id) on delete cascade,

  round         int not null check (round >= 1),
  slot          int not null check (slot >= 1),

  player_a      bigint references public.tournament_players(id) on delete set null,
  player_b      bigint references public.tournament_players(id) on delete set null,
  winner        bigint references public.tournament_players(id) on delete set null,

  score_a       int check (score_a >= 0),
  score_b       int check (score_b >= 0),
  played_at     timestamptz,

  unique (tournament_id, round, slot),

  -- 승자는 반드시 그 경기에 나온 두 사람 중 하나여야 합니다
  check (winner is null or winner = player_a or winner = player_b)
);

create index on public.tournament_matches (tournament_id, round, slot);


-- ---------------------------------------------------------------------------
-- 4. 트리거
-- ---------------------------------------------------------------------------

-- 4-1. university 는 앱이 아니라 주최자 프로필에서 채웁니다 (글과 같은 방식)
create or replace function public.prepare_tournament()
returns trigger language plpgsql security definer set search_path = public
as $fn$
begin
  if tg_op = 'INSERT' then
    new.host_id    := auth.uid();
    new.university := public.my_university();
  else
    -- 주최자와 학교는 바꿀 수 없습니다
    new.host_id    := old.host_id;
    new.university := old.university;
    new.updated_at := now();
  end if;
  return new;
end;
$fn$;

create trigger trg_tournaments_prepare
  before insert or update on public.tournaments
  for each row execute function public.prepare_tournament();

-- 4-2. 내가 이 대회의 주최자인가? (RLS 안에서 재귀를 피하려고 함수로 감쌉니다)
create or replace function public.is_tournament_host(t bigint)
returns boolean
language sql stable security definer set search_path = public
as $fn$
  select exists (
    select 1 from public.tournaments
    where id = t and host_id = auth.uid()
  );
$fn$;

-- 4-3. 이 대회를 볼 수 있는가? (같은 학교)
create or replace function public.can_view_tournament(t bigint)
returns boolean
language sql stable security definer set search_path = public
as $fn$
  select exists (
    select 1 from public.tournaments
    where id = t and university = public.my_university()
  );
$fn$;


-- ---------------------------------------------------------------------------
-- 5. RLS
--    보기는 같은 학교 학생 전부, 고치기는 주최자만.
-- ---------------------------------------------------------------------------
alter table public.tournaments        enable row level security;
alter table public.tournament_players enable row level security;
alter table public.tournament_matches enable row level security;

create policy tournaments_select on public.tournaments for select to authenticated
  using (university = public.my_university());
create policy tournaments_insert on public.tournaments for insert to authenticated
  with check (true);   -- host_id · university 는 트리거가 채웁니다
create policy tournaments_update on public.tournaments for update to authenticated
  using (host_id = auth.uid()) with check (host_id = auth.uid());
create policy tournaments_delete on public.tournaments for delete to authenticated
  using (host_id = auth.uid());

create policy players_select on public.tournament_players for select to authenticated
  using (public.can_view_tournament(tournament_id));
create policy players_write on public.tournament_players for insert to authenticated
  with check (public.is_tournament_host(tournament_id));
create policy players_update on public.tournament_players for update to authenticated
  using (public.is_tournament_host(tournament_id))
  with check (public.is_tournament_host(tournament_id));
create policy players_delete on public.tournament_players for delete to authenticated
  using (public.is_tournament_host(tournament_id));

create policy matches_select on public.tournament_matches for select to authenticated
  using (public.can_view_tournament(tournament_id));
create policy matches_write on public.tournament_matches for insert to authenticated
  with check (public.is_tournament_host(tournament_id));
create policy matches_update on public.tournament_matches for update to authenticated
  using (public.is_tournament_host(tournament_id))
  with check (public.is_tournament_host(tournament_id));
create policy matches_delete on public.tournament_matches for delete to authenticated
  using (public.is_tournament_host(tournament_id));


-- ---------------------------------------------------------------------------
-- 6. 대진표 만들기
--    참가자 수가 2·4·8·16 이 아니면 윗자리부터 부전승을 줍니다.
--    (예: 6명이면 1라운드는 2경기 + 2명 부전승 → 2라운드 4강)
--
--    이미 경기가 있으면 전부 지우고 다시 만듭니다. 현장에서 사람이 늦게 와
--    다시 짜는 일이 흔하기 때문입니다.
-- ---------------------------------------------------------------------------
create or replace function public.build_bracket(p_tournament_id bigint)
returns void
language plpgsql security definer set search_path = public
as $fn$
declare
  player_ids bigint[];
  n          int;
  size       int := 1;   -- n 이상인 가장 작은 2의 거듭제곱
  rounds     int;
  i          int;
  r          int;
  a          bigint;
  b          bigint;
begin
  if not public.is_tournament_host(p_tournament_id) then
    raise exception '대회 주최자만 대진표를 만들 수 있습니다.';
  end if;

  select array_agg(id order by id) into player_ids
  from public.tournament_players where tournament_id = p_tournament_id;

  n := coalesce(array_length(player_ids, 1), 0);
  if n < 2 then
    raise exception '참가자가 2명 이상이어야 대진표를 만들 수 있습니다.';
  end if;

  delete from public.tournament_matches where tournament_id = p_tournament_id;

  while size < n loop
    size := size * 2;
  end loop;
  rounds := 0;
  i := size;
  while i > 1 loop
    rounds := rounds + 1;
    i := i / 2;
  end loop;

  -- 1라운드: 양 끝에서 하나씩 짝지어 넣고, 빈자리는 부전승(상대가 null)
  for i in 1 .. size / 2 loop
    a := player_ids[i];
    b := case when size - i + 1 <= n then player_ids[size - i + 1] else null end;

    insert into public.tournament_matches (tournament_id, round, slot, player_a, player_b, winner)
    values (
      p_tournament_id, 1, i, a, b,
      -- 상대가 없으면 그대로 올라갑니다
      case when b is null then a else null end
    );
  end loop;

  -- 2라운드부터는 빈 경기만 미리 만들어 둡니다
  for r in 2 .. rounds loop
    for i in 1 .. size / (2 ^ r)::int loop
      insert into public.tournament_matches (tournament_id, round, slot)
      values (p_tournament_id, r, i);
    end loop;
  end loop;

  update public.tournaments set status = 'ongoing' where id = p_tournament_id;

  -- 부전승으로 이미 정해진 사람들을 다음 라운드에 올려둡니다
  perform public.advance_winners(p_tournament_id);
end;
$fn$;


-- ---------------------------------------------------------------------------
-- 7. 승자를 다음 라운드로 올리기
--    경기 결과를 넣은 뒤 부릅니다. 1라운드 1·2번 경기의 승자가
--    2라운드 1번 경기로 갑니다 (slot 을 2로 나눠 올림).
-- ---------------------------------------------------------------------------
create or replace function public.advance_winners(p_tournament_id bigint)
returns void
language plpgsql security definer set search_path = public
as $fn$
declare
  m record;
  target_slot int;
begin
  if not public.is_tournament_host(p_tournament_id) then
    raise exception '대회 주최자만 결과를 반영할 수 있습니다.';
  end if;

  for m in
    select * from public.tournament_matches
    where tournament_id = p_tournament_id and winner is not null
    order by round, slot
  loop
    target_slot := (m.slot + 1) / 2;

    if m.slot % 2 = 1 then
      update public.tournament_matches
      set player_a = m.winner
      where tournament_id = p_tournament_id and round = m.round + 1 and slot = target_slot;
    else
      update public.tournament_matches
      set player_b = m.winner
      where tournament_id = p_tournament_id and round = m.round + 1 and slot = target_slot;
    end if;
  end loop;

  -- 마지막 경기에 승자가 있으면 대회 종료
  update public.tournaments t
  set status = 'finished'
  where t.id = p_tournament_id
    and exists (
      select 1 from public.tournament_matches m2
      where m2.tournament_id = p_tournament_id
        and m2.winner is not null
        and m2.round = (select max(round) from public.tournament_matches where tournament_id = p_tournament_id)
    );
end;
$fn$;


-- ---------------------------------------------------------------------------
-- 8. 대회 목록 · 대진표 조회
-- ---------------------------------------------------------------------------
create or replace function public.get_tournaments()
returns table (
  id           bigint,
  title        text,
  sport        text,
  venue        text,
  starts_at    timestamptz,
  status       tournament_status,
  host_nickname text,
  is_host      boolean,
  player_count int,
  created_at   timestamptz
)
language sql stable security definer set search_path = public
as $fn$
  select t.id, t.title, t.sport, t.venue, t.starts_at, t.status,
         pr.nickname,
         t.host_id = auth.uid(),
         (select count(*)::int from public.tournament_players p where p.tournament_id = t.id),
         t.created_at
  from public.tournaments t
  join public.profiles pr on pr.id = t.host_id
  where t.university = public.my_university()
    -- 준비 중인 대회는 주최자에게만 보입니다
    and (t.status <> 'draft' or t.host_id = auth.uid())
  order by t.created_at desc;
$fn$;

create or replace function public.get_bracket(p_tournament_id bigint)
returns table (
  match_id   bigint,
  round      int,
  slot       int,
  player_a   bigint,
  name_a     text,
  player_b   bigint,
  name_b     text,
  winner     bigint,
  score_a    int,
  score_b    int
)
language sql stable security definer set search_path = public
as $fn$
  select m.id, m.round, m.slot,
         m.player_a, pa.name,
         m.player_b, pb.name,
         m.winner, m.score_a, m.score_b
  from public.tournament_matches m
  left join public.tournament_players pa on pa.id = m.player_a
  left join public.tournament_players pb on pb.id = m.player_b
  where m.tournament_id = p_tournament_id
    and public.can_view_tournament(p_tournament_id)
  order by m.round, m.slot;
$fn$;

-- API 가 새 표와 함수를 바로 알아보도록 스키마 캐시 새로고침
notify pgrst, 'reload schema';
