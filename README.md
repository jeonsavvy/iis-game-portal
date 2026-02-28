# iis-game-portal (IIS Arcade + Studio Console)

IIS 게임 탐색/플레이/운영실용 Next.js(App Router) 포털입니다.  
Cloudflare Workers(OpenNext) 배포를 기준으로 구성되어 있습니다.

## 주요 페이지

- `/` : 활성 게임 카탈로그 (`games_metadata`) + 장르/정렬/게임명 검색
- `/play/[id]` : 게임 iframe 플레이 화면
- `/login` : Studio Console 관리자 매직링크 로그인
- `/admin` : Studio Console
  - 파이프라인 트리거
  - Pause/Resume/Stop/Retry 오퍼레이터 제어
  - 실시간 파이프라인 로그
  - role 기반 접근 제어(`master_admin`)

## 인증/권한 흐름

- `/admin` 접근 시 미로그인이면 `/login?next=/admin`으로 이동
- `/login`에서 Supabase **Magic Link** 로그인
- `/auth/callback`에서 세션 교환 후 `/admin` 복귀
- 앱 레벨에서 `ADMIN_ALLOWED_EMAILS` 목록만 로그인 허용
- `/admin` 서버 렌더 단계에서 `profiles.role=master_admin` 권한 재검증

## 핵심 모듈

- `lib/supabase/*` : browser/server/admin/realtime 클라이언트
- `lib/auth/rbac.ts` : role 체크 (`master_admin` 단일 운영 모드)
- `lib/auth/admin-auth.ts` : 관리자 이메일 allowlist / next 경로 정규화
- `types/pipeline.ts` : 파이프라인/로그/제어 타입 정의
- `app/api/pipelines/trigger/route.ts` : 코어 엔진 트리거 프록시

## 로컬 실행

실행 컨텍스트 표기 규칙:
- `[LOCAL WSL]` : 사용자 PC의 WSL/로컬 터미널
- `[EC2 SSH]` : 코어 엔진 서버 SSH 셸
- `[Cloudflare Dashboard]` : Workers/Pages 런타임 변수 설정 화면
- `[GitHub Actions]` : `deploy-cloudflare` 워크플로우 재실행 화면

```bash
# [LOCAL WSL]
npm install
cp .env.example .env.local
npm run dev
```

검증 명령:

```bash
npm run clean:next
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run build
```

## 주요 환경변수

### 공개/브라우저
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SITE_URL` *(권장: canonical/OG 메타 기준 URL, 예: `https://arcade.example.com`)*

### 서버 전용
- `FEATURED_GAME_SLUG` *(선택: 홈 Hero 대표작 슬러그 고정)*
- `IIS_DEMO_PREVIEW` *(선택: `1`이면 Supabase 조회를 건너뛰고 샘플 데이터로 프리뷰 모드 렌더링)*
- `LEGACY_GAME_SANDBOX` *(선택: `1`이면 레거시 게임 호환을 위해 iframe `allow-same-origin` 임시 복구)*
- `LEGACY_GAME_SANDBOX_ALLOWLIST` *(선택: `id/slug` CSV. 전역 복구 없이 특정 게임만 레거시 sandbox 허용)*
- `ADMIN_ALLOWED_EMAILS` (예: `jeonsavvy@gmail.com`)
- `SUPABASE_SERVICE_ROLE_KEY`
- `CORE_ENGINE_URL`
- `CORE_ENGINE_API_TOKEN` *(production 권장/사실상 필수: 누락 시 BFF가 fail-fast로 500 반환)*

프리뷰 모드 샘플 썸네일/스크린샷은 로컬 정적 자산(`public/assets/preview/*.svg`)을 사용해
외부 이미지 네트워크 의존 없이 e2e 검증이 가능하도록 구성했습니다.

## 보안 메모

- `SUPABASE_SERVICE_ROLE_KEY`는 서버 전용 (클라이언트 노출 금지)
- Trigger/Approve 프록시는 로그인 + role 검사를 통과한 요청만 코어 엔진으로 전달
- Write 계열 BFF(`trigger/approve/control/delete`)는 `Origin`을 앱 동일 출처로 강제해 sandbox iframe의 `Origin: null` 요청을 차단
- Admin BFF(`pipeline:*`, `games/delete`) 응답은 기본 `Cache-Control: no-store`를 강제
- `/play/[id]` iframe은 기본 sandbox를 `allow-scripts`로 제한해 same-origin 권한을 제거
- artifact proxy는 `localhost/사설 IP` 소스를 차단하고, production에서는 `https` 소스만 허용
- artifact proxy는 리다이렉트를 최대 3 hop만 허용하며, 리다이렉트 대상도 동일 보안 규칙(공인 호스트/production https)을 강제
- artifact proxy API 응답은 성공/실패 모두 `Cache-Control: no-store`로 고정하고 `X-Frame-Options/SAMEORIGIN`, `X-Content-Type-Options/nosniff`, `Referrer-Policy/no-referrer`를 기본 주입
- artifact proxy 오류 응답도 `{ error, detail, code }` 계약으로 정규화
- 레거시 호환이 필요한 경우 `LEGACY_GAME_SANDBOX_ALLOWLIST`로 게임 단위 예외만 허용 (전역 `LEGACY_GAME_SANDBOX=1`은 긴급 롤백용)
- 이미지 최적화는 기본 활성화하며, `svg/data/blob`만 `unoptimized`로 처리
- `/admin`은 middleware 쿠키 게이트 + 서버측 RBAC 이중 검사
- 외부 fetch는 timeout/retry 사용 (`fetchWithRetry`) + `429/5xx` 재시도
- 비멱등 POST는 `Idempotency-Key` 없으면 재시도하지 않음

## Cloudflare 배포

- OpenNext 설정: `open-next.config.ts`
- Worker 설정: `wrangler.jsonc`
- CI 워크플로우: `.github/workflows/deploy-cloudflare.yml`
  - verify 단계: lint → typecheck → unit test(vitest) → e2e smoke(playwright) → build
  - verify/deploy build 직전 `clean:next` 수행으로 `.next/.turbo` 캐시 불일치 이슈를 완화
- PR/브랜치 검증 워크플로우: `.github/workflows/frontend-ci.yml`
  - `IIS_DEMO_PREVIEW=1`로 고정해 Supabase 의존 없이 PR 검증을 수행

### 배포 워크플로우 필수 GitHub Secrets

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SITE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CORE_ENGINE_URL`
- `CORE_ENGINE_API_TOKEN`
- `ADMIN_ALLOWED_EMAILS` *(권장: secret 또는 repo variable로 관리)*

## 트러블슈팅 (자주 보는 에러)

- `Could not find ... segment-explorer-node.js#SegmentViewNode` (Playwright/e2e 개발 서버 기동 시)
  - Next dev 캐시 불일치로 발생할 수 있는 일시 오류
  - `npm run clean:next`로 `.next/.turbo` 정리 후 재실행
  - 현재 `npm run test:e2e`는 실행 전에 자동으로 `clean:next`를 수행

- `CORE_ENGINE_URL is missing`
  - 포털 런타임에 `CORE_ENGINE_URL`이 비어있다는 뜻
  - `[GitHub Actions]` Repository Secret + `[Cloudflare Dashboard]` 런타임 변수 모두 확인 필요
  - 값 형식 예시: `http://<ec2-public-dns>:8000`
