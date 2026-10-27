# gym-buddy

같은 학교 학생끼리 운동 파트너를 찾는 앱. **Expo SDK 58** (React Native 0.88) + Supabase.

> 2026-10-27 에 SDK 57 → 58 로 올렸습니다. Expo Go 는 최신 SDK 만 지원해서,
> 폰의 Expo Go 가 자동 업데이트되면 예전 SDK 로 만든 프로젝트가 열리지 않습니다.
> 앞으로도 "버전이 안 맞는다" 는 말이 나오면 이 업그레이드부터 하세요.

## 1. 처음 실행하기

### 1) Supabase

1. https://supabase.com 에서 프로젝트 생성 (Region: **Northeast Asia (Seoul)**)
2. **SQL Editor** 에 `supabase/migrations/0001_init.sql` 붙여넣고 Run
3. 이어서 `supabase/migrations/0002_competitions.sql`, `0003_boards.sql`, `0004_post_sport.sql`, `0005_post_images.sql`, `0006_likes_received.sql`, `0007_post_join.sql`, `0008_capacity_total.sql`, `0009_message_reads.sql`, `0010_tournaments.sql` 도 순서대로 Run
4. **Project Settings → API** 에서 Project URL 과 `anon` public key 복사

### 2) 환경변수

```bash
cp .env.example .env.local
```

`.env.local` 에 위 값을 넣습니다.
`service_role` key 는 **절대** 넣지 마세요. 앱 번들에 그대로 박혀서 DB 전체가 열립니다.

### 3) 실행

```bash
npx expo start --tunnel ngrok
```

> SDK 58 부터 그냥 `--tunnel` 은 Expo 계정 로그인을 요구합니다.
> 로그인 없이 쓰려면 위처럼 뒤에 `ngrok` 을 붙이세요.

폰의 **Expo Go** 앱에서 "Enter URL manually" 로 터널 주소를 입력합니다.
같은 공유기를 쓰는 환경이면 `--tunnel` 없이 `npm start` 로도 됩니다.

## 2. 폴더 구조

```
app/                     ← 라우팅 전용. 화면 조립만 하고 로직은 넣지 않는다
├── _layout.tsx            Provider 등록 + 로그인/온보딩 분기 (AuthGate)
├── (auth)/                로그인, 온보딩
├── (tabs)/                탐색 / 매칭 / 게시판 / 내 프로필
├── chat/[matchId].tsx     1:1 채팅
├── board/
│   ├── [postId].tsx       게시글 상세 + 댓글
│   └── write.tsx          글쓰기 / 글 수정
├── profile/edit.tsx       프로필 수정 (사진 업로드 포함)
└── tournament/
    ├── [id].tsx           대회 상세 + 대진표 + 운영자 도구
    └── new.tsx            대회 만들기

features/                ← 기능 단위로 자른다 (화면 단위가 아님)
├── auth/     api.ts       로그인·로그아웃
├── profile/  api.ts hooks.ts + profile-form.tsx(온보딩·수정 공용 폼) avatar-picker.tsx
├── matching/ api.ts hooks.ts
├── chat/     api.ts
├── board/    api.ts hooks.ts   게시판 (자유 / 운동 / 장터)
├── safety/   api.ts       신고·차단
└── tournament/ api.ts hooks.ts + bracket-view.tsx(대진표) match-result-modal.tsx

components/ui/           ← 기능과 무관한 공용 컴포넌트 (report-reason-modal = 신고 사유 선택)
                            한 기능에서만 쓰는 컴포넌트는 그 features/<기능>/ 안에 둔다
constants/               ← theme.ts(색상표), workout.ts(운동 종목·시간대), board.ts(게시판 종류)
hooks/                   ← use-app-colors.ts (라이트/다크 색상)
lib/                     ← 앱 전체 인프라 (supabase 클라이언트, 세션, 쿼리 캐시, format.ts,
                            image-upload.ts = 사진 줄여서 올리기 — 프로필·게시판 공용)
types/database.ts        ← DB 스키마 타입
supabase/migrations/     ← DB 설계도 (SQL)
```

### 지켜야 할 규칙 4개

1. **`app/` 안의 파일은 화면 조립만.** 20줄 넘게 로직이 생기면 `features/` 로 옮긴다.
2. **컴포넌트에서 `supabase.from(...)` 을 직접 호출하지 않는다.**
   모든 쿼리는 `features/<기능>/api.ts` 안에만 둔다.
3. **화면에 `#97C459` 같은 색상값이나 제멋대로의 크기를 직접 적지 않는다.**
   색은 `useAppColors()`, 글자 크기·여백·모서리는 `constants/theme.ts` 의
   `Typography` / `Spacing` / `Radius` 를 쓴다. 디자인은 "스포츠형" (어두운 배경 + 형광 연두).
4. **`features/A` 가 `features/B` 를 import 하지 않는다.**
   공유가 필요하면 `lib/` 또는 `components/ui/` 로 올린다.
   (그래서 세션 관리가 `features/auth` 가 아니라 `lib/session.tsx` 에 있습니다)

## 3. 아직 안 한 것

### 다음에 이어서 할 순서 (2026-10-14 기준)

지금까지: 게시판(자유/운동/장터, 종목 분류, 사진 첨부, 모집글 참여),
탐색·받은 관심·매칭·1:1 채팅(안 읽음 표시), 신고·차단, 프로필 수정·사진 업로드,
밝은 테마로 전면 교체(모든 화면 theme.ts 토큰 사용).
Supabase 에 0001~0009 실행 완료 (2026-10-15 에 함수 교체까지 확인).

**먼저 폰에서 확인할 것** — 아래는 전부 코드 검증(타입·린트·번들)만 끝났고
실제 화면에서는 한 번도 돌려보지 않았습니다.

- [ ] 밝은 테마 — 흰 카드가 회색 배경과 구분되는지, 상태바 글자색,
      게시판 가운데 '+ 글쓰기' 버튼이 하단 탭과 겹치지 않는지
- [ ] 글쓰기 · 글 상세 · 프로필 수정 새 배치
- [ ] 글쓰기에서 키보드가 올라와도 아래 등록 버튼이 보이는지 (2026-10-15 수정함)
- [ ] 모집 인원 − / + 조절 (2~20명). 이미 올린 글도 관리 → 수정에서 변경 가능
- [ ] 모집 기능 — 운동게시판에 '총 2명' 모집글 → 목록에 1/2명 (글쓴이가 1명)
- [ ] 받은 관심 — 계정 2개로 수락 흐름
- [ ] 모집 참여 — 테스트 계정으로 참여 → 2/2명 → 세 번째는 막히는지
- [ ] 안 읽은 메시지 — 테스트 계정이 메시지 보내면 매칭 탭 배지와 목록 미리보기,
      대화방 열면 배지가 사라지는지

계정 두 개가 필요한 항목은 같은 폰에서 로그아웃 → `test2@test.ac.kr` 같은 주소로
가입 → **학교 이름을 원래 계정과 글자까지 똑같이** 입력하면 됩니다.

**그다음 후보**

1. 이용약관 · 개인정보처리방침 초안 — 스토어 등록 필수, 폰 없이 가능
2. 묻혀 있는 기능 꺼내기 — 차단 목록 보기·해제(심사에서 요구받는 경우 많음),
   매칭 해제, 탐색 필터(성별·학교). DB·API 는 이미 있고 화면만 없음
3. 학교 이메일 실제 인증 + 비밀번호 찾기 — 메일 서비스 가입과 Supabase 설정 필요.
   외부 공개 전 필수이고 학교 대항전의 전제 조건
4. 푸시 알림 — 지금은 앱 안 배지만 있음. 안드로이드 Expo Go 는 원격 푸시를
   받을 수 없어 개발용 빌드가 필요
5. 대회 기능 — 교내 대회 · 학교 대항전. 3번이 먼저

**주의**

- Supabase 무료 플랜은 한동안 접속이 없으면 프로젝트를 재웁니다.
  멈췄으면 대시보드에서 Restore 를 누르고 2~5분 기다리면 됩니다 (데이터는 안전).
- 마이그레이션은 한 번 실행한 파일을 고치지 말고 새 번호로 추가하세요.
  0008 이 그 원칙을 어겼다가 생긴 수습 파일입니다.

### 다른 컴퓨터에서 다시 시작할 때

1. Node.js LTS 설치
2. `git clone https://github.com/k01072208775-bot/gym-buddy.git` → 그 폴더에서 `npm install`
3. **`.env.local` 을 직접 만든다** — Supabase 키가 들어 있어 git 에 올라가지 않습니다.
   `.env.example` 을 복사해 실제 값을 채우세요. 이 파일이 없으면 로그인부터 안 됩니다.
4. `npx expo start --tunnel ngrok` → 터미널의 QR 을 폰 Expo Go 로 찍습니다

SDK 58 부터 그냥 `--tunnel` 은 Expo 계정 로그인을 요구합니다. 위처럼 `ngrok` 을 붙이면 로그인 없이 됩니다.

### 작업한 걸 저장하고 올릴 때

```bash
git add -A
git commit -m "무엇을 했는지"
git push
```

망쳤을 때 마지막 커밋으로 되돌리기: `git restore .`

- [x] 프로필 사진 업로드 (512px JPEG 로 줄여서 올림 — 원본은 1.4MB 씩 됩니다)
- [x] 프로필 수정 화면 (`features/profile/profile-form.tsx` 를 온보딩과 공유)
- [x] 탐색 화면·채팅에도 신고 사유 선택 적용
- [x] 받은 관심 — 나에게 '같이 운동해요'를 보낸 사람을 매칭 탭에서 수락/거절 (`0006`), 탭 배지로 알림
- [x] 게시판 사진 첨부 (글당 4장, 목록에 썸네일) — `0005_post_images.sql` 실행 필요
- [ ] 운동게시판 종목 태그 / 게시글 검색
- [ ] 대회 기능 화면 전체 (DB는 `0002_competitions.sql` 로 준비됨)
- [ ] 이용약관 / 개인정보처리방침 페이지 — **스토어 등록 필수**
- [ ] 푸시 알림 (매칭 성사 / 새 메시지)

## 4. 스토어 출시 전 체크리스트

매칭 앱은 사용자 생성 콘텐츠(UGC) 앱이라 Apple App Review 1.2 조항이 적용됩니다.
아래가 없으면 리젝됩니다.

- [x] 신고 기능 (`features/safety`)
- [x] 차단 기능 (`features/safety`)
- [ ] 가입 시 이용약관 동의 절차
- [ ] 신고 접수 후 24시간 내 처리 — `reports` 테이블의 `status = 'pending'` 을 매일 확인
- [ ] 개인정보처리방침 URL

## 5. 게시판 규칙 (`0003_boards.sql`)

- **같은 학교 학생 글만 보인다.** 글의 `university` 는 앱이 아니라 DB 트리거가 작성자 프로필에서 채운다.
- **차단하면 서로의 글·댓글이 사라진다.** (`get_posts` / `get_comments` 와 RLS 양쪽에서 거름)
- **좋아요 수·댓글 수는 앱이 못 바꾼다.** `post_likes` / `post_comments` 트리거만 변경.
- 장터 글만 `price`, `trade_status` 를 가진다 (DB check 제약).
- 게시글·댓글 신고는 `reports.post_id` / `reports.comment_id` 에 기록된다.
- 게시판 추가: `alter type board_type add value '...'` 를 새 마이그레이션으로 → `constants/board.ts` 에 추가.

## 6. 대회 기능 (참가비) 주의사항

`0002_competitions.sql` 에 오프라인 대회 + 참가비 스키마가 들어 있습니다.
돈이 걸리는 기능이라 아래 세 가지가 DB 제약으로 잠겨 있습니다. 풀지 마세요.

1. **참가비 금액을 앱이 정하지 못한다** — RLS가 대회에 적힌 `entry_fee` 와 대조
2. **결제 상태를 앱이 바꾸지 못한다** — `payments` 에 INSERT/UPDATE 정책 없음 (서버 전용)
3. **상금 비율 상한 70%** — 참가비 전액을 상금으로 돌리면 사행성 논란 소지

실제 운영 전 준비: 사업자등록(PG 계약 조건), 환불 규정 문구, 상금 원천징수 세무 확인.

## 7. 스키마를 바꿨을 때

`supabase/migrations/` 에 `0003_xxx.sql` 로 새 파일을 추가하고 (기존 파일 수정 X),
SQL Editor 에서 실행한 뒤 타입을 다시 생성합니다.

```bash
npx supabase gen types typescript --project-id uhodbbxwjtsxshikwnkd > types/database.ts
```
