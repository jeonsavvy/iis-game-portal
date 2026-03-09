# IIS Game Portal

IIS 전체 서비스에서 공개 카탈로그, 플레이 화면, 제작 작업공간, 운영 화면을 제공하는 Next.js 포털입니다.

## 이 저장소가 맡는 책임

- 공개 게임 목록과 상세 플레이 진입점 제공
- `/play/[slug]` 보안 iframe 기반 플레이 화면 제공
- 제작 작업공간에서 세션 생성, 프롬프트 실행, 수정 검토, 퍼블리시 실행
- 운영 화면에서 세션과 공개 게임 상태 관리
- Core Engine API를 위한 BFF 라우트 제공

## 빠른 시작

```bash
npm ci
cp .env.example .env.local
npm run dev
```

기본 개발 주소: `http://localhost:3000`

실사용 로컬 값은 `.env.local` 에만 두고, `.env` 는 저장소에 두지 않습니다.

## 화면 구조

### 공개 화면

- `/` : 공개 게임 카탈로그
- `/play/[slug]` : 실제 플레이 화면
- `/create` : 제작 작업 진입 안내

### 제작 및 운영 화면

- `/workspace` : 제작 작업공간
- `/admin` : 운영 허브
- `/admin/sessions` : 세션 운영 화면
- `/admin/games` : 공개 게임 관리 화면
- `/login` / `/auth/callback` : 로그인 진입과 복귀

### 호환용 리다이렉트 경로

- `/discover` → `/`
- `/editor` → `/workspace`
- `/games/[slug]` → `/play/[slug]`
- `/workspace/[sessionId]` → `/workspace?session=<id>`

## 인증과 권한

- `middleware.ts` 가 `/admin/*`, `/workspace*` 접근을 먼저 검사합니다.
- 로그인은 Supabase Magic Link 기반입니다.
- 허용 이메일은 `ADMIN_ALLOWED_EMAILS` 로 제한합니다.
- 역할 기준은 `lib/auth/rbac.ts` 를 사용합니다.
  - `creator`, `master_admin` : 작업공간 접근 가능
  - `master_admin` : 운영 화면과 게임 삭제 가능
- `IIS_DEMO_PREVIEW=1` 일 때는 샘플 데이터로 화면을 렌더링합니다.

## Core Engine 연동 범위

다음 BFF 라우트는 Core Engine으로 프록시됩니다.

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
- `GET /api/sessions/[sessionId]/publish-thumbnail-candidates`
- `POST /api/sessions/[sessionId]/cancel`

포털 고유 라우트:

- `GET /api/games/[id]/artifact`
- `GET /api/games/[id]/artifact/[...asset]`
- `GET /api/games/[id]/leaderboard`
- `POST /api/games/[id]/play-event`
- `POST /api/games/delete`

## 핵심 환경변수

전체 샘플은 `.env.example` 에 있습니다.

| 변수 | 설명 |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | 브라우저와 SSR에서 쓰는 Supabase URL입니다. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 브라우저 anon key입니다. |
| `NEXT_PUBLIC_SITE_URL` | canonical, metadata, OG 기준 URL입니다. |
| `SUPABASE_SERVICE_ROLE_KEY` | 서버 전용 admin client용 키입니다. |
| `CORE_ENGINE_URL` | Core Engine base URL입니다. |
| `CORE_ENGINE_API_TOKEN` | production BFF Bearer 토큰입니다. |
| `ADMIN_ALLOWED_EMAILS` | 작업공간/운영화면 허용 이메일 목록입니다. |
| `IIS_DEMO_PREVIEW` | 샘플 데이터 렌더링 여부입니다. |
| `FEATURED_GAME_SLUG` | 홈 상단 대표 게임을 고정할 때 사용합니다. |
| `OPS_COLLAB_ROOM_V2` | 운영실 협업 화면 롤아웃 플래그입니다. |
| `LEGACY_GAME_SANDBOX` | 특정 레거시 게임 호환용 iframe 롤백 플래그입니다. |
| `LEGACY_GAME_SANDBOX_ALLOWLIST` | 예외 허용 대상 게임 목록입니다. |

## 검증

```bash
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run build
```

## 배포

- PR 검증: `.github/workflows/frontend-ci.yml`
- 배포: `.github/workflows/deploy-cloudflare.yml`
- OpenNext 설정: `open-next.config.ts`
- Cloudflare 설정: `wrangler.jsonc`

## 공개 저장소 기준

- 비밀값은 `.env.local` 에만 둡니다.
- 서버 전용 키는 브라우저 번들에 포함하지 않습니다.
- 플레이 산출물은 원본 URL을 그대로 노출하지 않고 프록시를 거쳐 전달합니다.
- 미사용 레거시 UI 조각은 저장소에서 제거해 현재 제품 구조만 남깁니다.

## License

MIT
