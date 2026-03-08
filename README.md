# IIS Game Portal

IIS의 공개 게임 카탈로그, 보안 플레이어, 제작 작업공간, 운영실을 제공하는 Next.js App Router 포털입니다.  
배포 타깃은 Cloudflare Workers(OpenNext)입니다.

## Quick Start

```bash
npm ci
cp .env.example .env.local
npm run dev
```

기본 개발 주소: `http://localhost:3000`

## 현재 제품 화면

### 공개 화면

- `/` : 공개 게임 카탈로그, 검색, 장르 필터, 인기/신규/이름순 정렬
- `/play/[slug]` : 보안 iframe 기반 플레이 화면, 게임 소개/조작법 노출, 플레이 이벤트 기록
- `/create` : 프리셋 프롬프트로 작업공간 진입

### 제작/운영 화면

- `/workspace` : `creator` / `master_admin` 전용 세션 편집기
  - 세션 생성/선택/삭제
  - 프롬프트 전송
  - plan-draft 생성
  - 이슈 제기 → 수정안 생성 → 수정 적용
  - 퍼블리시 승인/실행
- `/admin` : 운영 허브
- `/admin/sessions` : 세션 운영실, 이벤트 타임라인, 실행 상태, 승인 흐름
- `/admin/games` : 공개 게임 목록 및 삭제 관리
- `/login` → `/auth/callback` : Supabase Magic Link 로그인

### 호환용 리다이렉트 라우트

- `/discover` → `/`
- `/editor` → `/workspace`
- `/games/[slug]` → `/play/[slug]`
- `/workspace/[sessionId]` → `/workspace?session=<id>`

## 아키텍처

- Framework: Next.js 15 + React 19 + TypeScript
- Styling: Tailwind CSS v4 + Radix UI primitives
- Auth / data: Supabase SSR (`lib/supabase/*`)
- Core Engine BFF: `app/api/sessions/*`
- Public game APIs: `app/api/games/*`
- Cloudflare/OpenNext config: `open-next.config.ts`, `wrangler.jsonc`
- Preview mode seed data: `lib/demo/preview-data.ts`

## 인증 / 권한 모델

- `middleware.ts`가 `/admin/*`, `/workspace*`에 Supabase auth cookie 게이트를 적용합니다.
- 로그인은 Supabase Magic Link 기반입니다.
- 앱 레벨 allowlist는 `ADMIN_ALLOWED_EMAILS`로 제한합니다.
- 역할 기반 권한은 `lib/auth/rbac.ts` 기준입니다.
  - `creator`, `master_admin` → 작업공간 접근 가능
  - `master_admin` → 운영실/게임 삭제 접근 가능
- Preview mode(`IIS_DEMO_PREVIEW=1`)에서는 Supabase 조회 없이 샘플 데이터로 렌더링됩니다.

## BFF / API Surface

### Core session proxy

다음 라우트는 Core Engine(`/api/v1/...`)로 프록시됩니다.

- `GET/POST /api/sessions`
- `GET/DELETE /api/sessions/[sessionId]`
- `GET /api/sessions/[sessionId]/conversation`
- `GET /api/sessions/[sessionId]/events`
- `POST /api/sessions/[sessionId]/plan-draft`
- `POST /api/sessions/[sessionId]/prompt`
- `GET /api/sessions/[sessionId]/runs/[runId]`
- `POST /api/sessions/[sessionId]/runs/[runId]/cancel`
- `POST /api/sessions/[sessionId]/issues`
- `GET /api/sessions/[sessionId]/issues/latest`
- `POST /api/sessions/[sessionId]/issues/[issueId]/propose-fix`
- `POST /api/sessions/[sessionId]/issues/[issueId]/apply-fix`
- `POST /api/sessions/[sessionId]/approve-publish`
- `POST /api/sessions/[sessionId]/publish`
- `POST /api/sessions/[sessionId]/cancel`

### Public / portal-native APIs

- `GET /api/games/[id]/artifact`
- `GET /api/games/[id]/artifact/[...asset]`
- `GET /api/games/[id]/leaderboard`
- `POST /api/games/[id]/play-event`
- `POST /api/games/delete`

## 주요 환경변수

전체 샘플은 `.env.example`를 기준으로 유지합니다.

| 변수 | 용도 |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | 브라우저/SSR Supabase URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 브라우저 anon key |
| `NEXT_PUBLIC_SITE_URL` | metadata/OG/canonical 기준 URL |
| `SUPABASE_SERVICE_ROLE_KEY` | 서버 전용 admin client |
| `CORE_ENGINE_URL` | Core Engine base URL |
| `CORE_ENGINE_API_TOKEN` | production BFF Bearer token |
| `ADMIN_ALLOWED_EMAILS` | 허용 이메일 allowlist |
| `IIS_DEMO_PREVIEW` | `1`이면 preview seed data 모드 |
| `FEATURED_GAME_SLUG` | 홈 대표작 고정(선택) |
| `LEGACY_GAME_SANDBOX` | 레거시 iframe 호환 전체 롤백 플래그 |
| `LEGACY_GAME_SANDBOX_ALLOWLIST` | 특정 게임만 legacy sandbox 허용 |

프리뷰 모드 썸네일은 `public/assets/preview/*.svg`를 사용하므로 외부 이미지 네트워크 없이도 e2e 검증이 가능합니다.

## 보안 메모

- `SUPABASE_SERVICE_ROLE_KEY`는 서버 전용입니다.
- 모든 write BFF는 `Origin` 검증을 통과해야 합니다.
- 읽기/쓰기 BFF는 `withAdminGuard`를 통해 로그인 + 역할 검사를 수행합니다.
- Core proxy는 timeout/retry를 사용하며, 비멱등 POST는 `Idempotency-Key`가 없으면 재시도하지 않습니다.
- artifact proxy는 `localhost`/사설 IP/비보안 리다이렉트 체인을 차단합니다.
- `/play/[slug]` iframe은 기본적으로 same-origin 권한 없이 sandbox 됩니다.
- 응답 헤더는 `Cache-Control: no-store`와 기본 보안 헤더를 강제합니다.

## 검증

```bash
npm run clean:next
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run build
```

## 배포

- PR/브랜치 검증: `.github/workflows/frontend-ci.yml`
  - `IIS_DEMO_PREVIEW=1`로 Supabase 의존 없이 lint → typecheck → unit → e2e → build 실행
- main 배포: `.github/workflows/deploy-cloudflare.yml`
  - verify 후 `@opennextjs/cloudflare`로 build/deploy
- OpenNext 설정: `open-next.config.ts`
- Worker 설정: `wrangler.jsonc`

필수 시크릿/런타임 변수는 현재 워크플로우 기준 아래 조합입니다.

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SITE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CORE_ENGINE_URL`
- `CORE_ENGINE_API_TOKEN`
- `ADMIN_ALLOWED_EMAILS`

## 트러블슈팅

- Next/Playwright 실행 중 캐시 불일치가 보이면 먼저 `npm run clean:next`
- `CORE_ENGINE_URL is missing`
  - 포털 런타임 변수 또는 GitHub Actions secret 누락
  - 예시: `http://<backend-host>:8000`
