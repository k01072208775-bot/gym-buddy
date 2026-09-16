-- ============================================================================
--  gym-buddy : 오프라인 대회 + 참가비 (0002_competitions.sql)
--
--  0001_init.sql 을 먼저 실행한 뒤에 실행하세요.
--
--  ★ 이 스키마의 대전제
--    1) 대회는 운영자만 개설한다 (INSERT 정책이 없음 = 아무나 못 만듦)
--    2) 참가비 금액을 앱이 정하지 못한다 (DB가 대회에 적힌 금액과 대조)
--    3) 결제 상태는 앱이 절대 못 바꾼다 (서버만 변경 가능)
--    이 세 가지가 무너지면 돈이 걸린 기능은 바로 사고가 납니다.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. ENUM 타입
-- ---------------------------------------------------------------------------
create type competition_status as enum (
  'draft',      -- 작성 중 (참가자에게 안 보임)
  'open',       -- 신청 접수 중
  'closed',     -- 신청 마감
  'ongoing',    -- 진행 중
  'finished',   -- 종료
  'cancelled'   -- 취소 (전액 환불 대상)
);

create type entry_status as enum (
  'pending_payment', -- 신청함, 입금 대기
  'paid',            -- 입금 확인됨
  'cancelled',       -- 입금 전 취소
  'refunded',        -- 입금 후 환불
  'attended',        -- 당일 참석
  'no_show'          -- 미참석
);

create type payment_status as enum ('ready', 'paid', 'failed', 'cancelled', 'refunded');

create type payment_provider as enum (
  'bank_transfer',  -- 계좌이체 후 운영자가 수동 확인 (1단계)
  'tosspayments',   -- PG 연동 (2단계)
  'portone'
);

create type ledger_kind as enum ('income', 'expense', 'prize');


-- ---------------------------------------------------------------------------
-- 2. 대회
-- ---------------------------------------------------------------------------
create table public.competitions (
  id                    bigint generated always as identity primary key,
  host_id               uuid not null references public.profiles(id) on delete restrict,

  title                 text not null check (char_length(title) between 2 and 60),
  description           text check (char_length(description) <= 2000),
  sport                 text not null,

  -- 오프라인 대회이므로 장소·시간은 필수입니다.
  -- 앱스토어 심사에서 "왜 인앱결제를 안 쓰냐"고 물으면
  -- 이 필드들이 실물 오프라인 행사라는 근거가 됩니다.
  venue_name            text not null,
  venue_address         text not null,
  starts_at             timestamptz not null,
  ends_at               timestamptz,
  registration_deadline timestamptz not null,

  capacity              int not null check (capacity between 2 and 500),
  entry_fee             int not null check (entry_fee between 0 and 1000000),  -- 원 단위

  -- 참가비 중 상금으로 나가는 비율(%). 70% 를 상한으로 막아둡니다.
  -- 전액을 상금으로 돌리는 구조는 사행성 논란의 소지가 크기 때문에
  -- 정책이 아니라 DB 제약으로 걸어둡니다.
  prize_ratio           int not null default 0 check (prize_ratio between 0 and 70),
  prize_description     text,

  -- 전자상거래법상 환불 규정은 결제 전에 반드시 고지해야 합니다.
  refund_policy         text not null,

  status                competition_status not null default 'draft',
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),

  check (registration_deadline <= starts_at),
  check (ends_at is null or ends_at >= starts_at)
);


-- ---------------------------------------------------------------------------
-- 3. 참가 신청
-- ---------------------------------------------------------------------------
create table public.competition_entries (
  id             bigint generated always as identity primary key,
  competition_id bigint not null references public.competitions(id) on delete cascade,
  user_id        uuid   not null references public.profiles(id) on delete cascade,

  status         entry_status not null default 'pending_payment',

  -- 신청 시점의 참가비를 여기에 박제합니다.
  -- 나중에 대회 참가비를 바꿔도 이미 신청한 사람의 금액은 그대로 남아야 합니다.
  amount         int not null check (amount >= 0),

  -- 환불 규정에 동의했다는 기록. 분쟁이 생기면 이게 근거가 됩니다.
  agreed_refund_policy boolean not null default false,

  created_at     timestamptz not null default now(),
  paid_at        timestamptz,
  cancelled_at   timestamptz,

  unique (competition_id, user_id)
);


-- ---------------------------------------------------------------------------
-- 4. 결제 기록
--    참가 신청과 분리합니다. 결제는 실패하고 다시 시도할 수 있고,
--    부분 환불도 생기기 때문에 신청 1건에 결제 여러 건이 붙습니다.
-- ---------------------------------------------------------------------------
create table public.payments (
  id                  bigint generated always as identity primary key,
  entry_id            bigint not null references public.competition_entries(id) on delete cascade,

  provider            payment_provider not null,
  provider_payment_id text,             -- PG사 거래번호 / 입금자명
  amount              int not null check (amount > 0),
  status              payment_status not null default 'ready',

  paid_at             timestamptz,
  refunded_at         timestamptz,
  refund_amount       int not null default 0 check (refund_amount >= 0),

  raw                 jsonb,            -- PG 응답 원본. 분쟁 대비용으로 통째로 보관
  created_at          timestamptz not null default now(),

  check (refund_amount <= amount)
);


-- ---------------------------------------------------------------------------
-- 5. 대회 결과 · 상금
-- ---------------------------------------------------------------------------
create table public.competition_results (
  id             bigint generated always as identity primary key,
  competition_id bigint not null references public.competitions(id) on delete cascade,
  user_id        uuid   not null references public.profiles(id) on delete cascade,

  rank           int  not null check (rank >= 1),
  record         text,                                        -- '스쿼트 140kg' 등
  prize_amount   int  not null default 0 check (prize_amount >= 0),

  -- 상금은 기타소득이라 원천징수 의무가 생깁니다.
  -- 실제 지급액 = prize_amount - withheld_tax
  withheld_tax   int  not null default 0 check (withheld_tax >= 0),
  paid_out_at    timestamptz,

  created_at     timestamptz not null default now(),

  unique (competition_id, user_id),
  unique (competition_id, rank),
  check (withheld_tax <= prize_amount)
);


-- ---------------------------------------------------------------------------
-- 6. 대회 정산 장부
--    "참가비 걷어서 어디에 썼는지" 를 참가자에게 공개하기 위한 표입니다.
--    이 투명성이 사행성 오해와 참가자 불만을 동시에 줄여줍니다.
-- ---------------------------------------------------------------------------
create table public.competition_ledger (
  id             bigint generated always as identity primary key,
  competition_id bigint not null references public.competitions(id) on delete cascade,
  kind           ledger_kind not null,
  label          text not null,        -- '체육관 대관료', '트로피 제작' 등
  amount         int  not null,
  occurred_on    date not null default current_date,
  created_at     timestamptz not null default now()
);


-- ---------------------------------------------------------------------------
-- 7. 인덱스
-- ---------------------------------------------------------------------------
create index on public.competitions        (status, starts_at);
create index on public.competition_entries (competition_id, status);
create index on public.competition_entries (user_id);
create index on public.payments            (entry_id);
create index on public.competition_results (competition_id, rank);
create index on public.competition_ledger  (competition_id);


-- ---------------------------------------------------------------------------
-- 8. 헬퍼 함수
-- ---------------------------------------------------------------------------

-- 8-1. 현재 자리를 차지하고 있는 신청 수 (정원 확인용)
--      RLS 정책 안에서 같은 테이블을 조회하면 무한 재귀에 빠지므로
--      security definer 함수로 감싸서 호출합니다.
create or replace function public.active_entry_count(comp_id bigint)
returns int
language sql stable security definer set search_path = public
as $fn$
  select count(*)::int
  from public.competition_entries
  where competition_id = comp_id
    and status in ('pending_payment', 'paid', 'attended');
$fn$;

-- 8-2. 내가 이 대회의 주최자인가?
create or replace function public.is_competition_host(comp_id bigint)
returns boolean
language sql stable security definer set search_path = public
as $fn$
  select exists (
    select 1 from public.competitions
    where id = comp_id and host_id = auth.uid()
  );
$fn$;

-- 8-3. updated_at 자동 갱신 (0001 에서 만든 함수를 재사용)
create trigger trg_competitions_touch before update on public.competitions
  for each row execute function public.touch_updated_at();

-- 8-4. 참가 신청 수정 시 핵심 정보 변조 차단
--      RLS 는 "수정 전 값"을 볼 수 없어서 금액 변조를 막지 못합니다.
--      그래서 트리거로 한 번 더 잠급니다.
create or replace function public.guard_entry_update()
returns trigger language plpgsql
as $fn$
begin
  -- 서버(Edge Function / 운영자)는 통과시킨다
  if current_user in ('service_role', 'postgres', 'supabase_admin') then
    return new;
  end if;

  if new.competition_id <> old.competition_id
     or new.user_id <> old.user_id
     or new.amount  <> old.amount
     or new.paid_at is distinct from old.paid_at then
    raise exception '참가 신청의 금액·대상은 변경할 수 없습니다.';
  end if;

  return new;
end;
$fn$;

create trigger trg_entry_guard before update on public.competition_entries
  for each row execute function public.guard_entry_update();


-- ---------------------------------------------------------------------------
-- 9. RLS
-- ---------------------------------------------------------------------------
alter table public.competitions        enable row level security;
alter table public.competition_entries enable row level security;
alter table public.payments            enable row level security;
alter table public.competition_results enable row level security;
alter table public.competition_ledger  enable row level security;

-- 9-1. 대회 : 공개된 것만 조회. INSERT/UPDATE 정책이 없다 = 운영자(service_role)만 개설 가능
--      학생 누구나 대회를 열고 돈을 걷게 하면
--      사기가 발생했을 때 책임이 전부 앱 운영자에게 돌아옵니다.
create policy competitions_select on public.competitions for select to authenticated
  using (status <> 'draft' or host_id = auth.uid());

-- 9-2. 참가 신청
create policy entries_select on public.competition_entries for select to authenticated
  using (user_id = auth.uid() or public.is_competition_host(competition_id));

-- ★ 이 정책이 이 파일에서 가장 중요합니다.
--   앱이 amount 를 마음대로 보내도, 대회에 적힌 entry_fee 와 다르면 INSERT 가 거부됩니다.
--   (이게 없으면 참가비 30,000원짜리를 100원에 신청할 수 있습니다)
create policy entries_insert on public.competition_entries for insert to authenticated
  with check (
    user_id = auth.uid()
    and status = 'pending_payment'
    and agreed_refund_policy = true
    and exists (
      select 1 from public.competitions c
      where c.id = competition_id
        and c.status = 'open'
        and c.registration_deadline > now()
        and c.entry_fee = amount
    )
    and public.active_entry_count(competition_id)
        < (select capacity from public.competitions where id = competition_id)
  );

-- 입금 전에는 본인이 직접 취소할 수 있습니다.
-- 입금 후 환불은 돈이 오가므로 서버에서만 처리합니다.
create policy entries_cancel on public.competition_entries for update to authenticated
  using (user_id = auth.uid() and status = 'pending_payment')
  with check (user_id = auth.uid() and status = 'cancelled');

-- 9-3. 결제 : 조회만 가능. INSERT/UPDATE 정책이 아예 없습니다.
--      앱이 결제 상태를 'paid' 로 바꿀 수 있으면 아무도 돈을 안 냅니다.
create policy payments_select on public.payments for select to authenticated
  using (
    exists (
      select 1 from public.competition_entries e
      where e.id = entry_id
        and (e.user_id = auth.uid() or public.is_competition_host(e.competition_id))
    )
  );

-- 9-4. 결과 · 장부 : 누구나 볼 수 있고, 쓰기는 운영자만
create policy results_select on public.competition_results for select to authenticated
  using (true);

create policy ledger_select on public.competition_ledger for select to authenticated
  using (true);


-- ---------------------------------------------------------------------------
-- 10. 대회 목록용 뷰 (남은 자리를 매번 계산하지 않기 위해)
-- ---------------------------------------------------------------------------
create or replace view public.competition_list
with (security_invoker = true)
as
  select
    c.*,
    public.active_entry_count(c.id)                        as entry_count,
    c.capacity - public.active_entry_count(c.id)           as seats_left,
    (c.entry_fee * c.capacity * c.prize_ratio / 100)       as max_prize_pool
  from public.competitions c;
