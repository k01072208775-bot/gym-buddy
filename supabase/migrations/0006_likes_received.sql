-- ============================================================================
--  gym-buddy : 받은 관심 (0006_likes_received.sql)
--
--  0005_post_images.sql 까지 실행한 뒤에 실행하세요.
--
--  전에는 두 사람이 각자 탐색에서 우연히 서로를 만나 둘 다 '같이 운동해요'를
--  눌러야만 매칭됐습니다. 한쪽이 먼저 눌러도 상대는 그 사실을 알 수 없었습니다.
--  이제 나를 좋아요한 사람 목록을 보여주고, 거기서 수락하면 바로 매칭됩니다.
--
--  수락 / 거절에는 새 테이블이 필요 없습니다.
--    수락 = swipes 에 like 기록 → 기존 트리거(handle_mutual_like)가 matches 생성
--    거절 = swipes 에 pass 기록 → swipes_select 정책상 상대는 절대 볼 수 없음
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 나에게 '같이 운동해요'를 보낸 사람들 (아직 내가 답하지 않은 사람만)
--
-- ★ like 만 보여줍니다. 누가 나를 pass 했는지는 어떤 경로로도 노출하지 마세요.
--   swipes 테이블은 RLS 로 '내가 한 것만' 보이게 막혀 있어서
--   security definer 함수로만 꺼낼 수 있고, 그래서 조건을 여기서 엄격히 겁니다.
-- ---------------------------------------------------------------------------
create or replace function public.get_likes_received(limit_count int default 50)
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
  shared_slots  int,
  liked_at      timestamptz
)
language sql stable security definer set search_path = public
as $fn$
  with me as (
    select wp.sports, wp.time_slots
    from public.workout_prefs wp
    where wp.user_id = auth.uid()
  )
  select p.id, p.nickname, p.university, p.gender, p.birth_year, p.bio, p.avatar_url,
         wp.sports, wp.gym_name, wp.time_slots, wp.experience,
         cardinality(array(select unnest(wp.sports)     intersect select unnest(me.sports)))::int,
         cardinality(array(select unnest(wp.time_slots) intersect select unnest(me.time_slots)))::int,
         s.created_at
  from public.swipes s
  join public.profiles p       on p.id = s.from_user
  join public.workout_prefs wp on wp.user_id = p.id
  cross join me
  where s.to_user = auth.uid()
    and s.action  = 'like'
    and p.is_active
    and not public.is_blocked(p.id)
    -- 내가 이미 수락(like)했거나 거절(pass)한 사람은 빼기
    and not exists (
      select 1 from public.swipes mine
      where mine.from_user = auth.uid() and mine.to_user = p.id
    )
  order by s.created_at desc
  limit least(limit_count, 100);
$fn$;

-- API 가 새 함수를 바로 알아보도록 스키마 캐시 새로고침
notify pgrst, 'reload schema';
