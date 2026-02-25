# iis-game-portal (IIS Arcade + Studio Console)

IIS 게임 탐색/플레이/운영 콘솔용 Next.js(App Router) 포털입니다.  
Cloudflare Workers(OpenNext) 배포를 기준으로 구성되어 있습니다.

## 주요 페이지

- `/` : 활성 게임 카탈로그 (`games_metadata`) + 장르/정렬/게임명 검색
- `/play/[id]` : 게임 iframe 플레이 화면
- `/login` : Studio Console 관리자 매직링크 로그인
- `/admin` : Studio Console
  - 파이프라인 트리거
  - 수동 단계 승인
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
- `types/pipeline.ts` : `Stylist`, `style` 포함
- `app/api/pipelines/approve/route.ts` : 수동 단계 승인 프록시
- `app/api/pipelines/trigger/route.ts` : 코어 엔진 트리거 프록시

## 후원 CTA (현재 정책)

- GNB에는 **PayPal 외부 후원 링크**만 노출
- 앱 내 결제 시스템이 아니라 외부 링크 이동 UX만 제공
- URL은 HTTPS + allowlist(host) 검증 후 노출

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

## 주요 환경변수

### 공개/브라우저
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_PAYPAL_DONATION_URL`

### 서버 전용
- `FEATURED_GAME_SLUG` *(선택: 홈 Hero 대표작 슬러그 고정)*
- `IIS_DEMO_PREVIEW` *(선택: `1`이면 Supabase 없이 샘플 데이터 프리뷰 모드)*
- `ADMIN_ALLOWED_EMAILS` (예: `jeonsavvy@gmail.com`)
- `SUPABASE_SERVICE_ROLE_KEY`
- `CORE_ENGINE_URL`
- `CORE_ENGINE_API_TOKEN`

## 보안 메모

- `SUPABASE_SERVICE_ROLE_KEY`는 서버 전용 (클라이언트 노출 금지)
- Trigger/Approve 프록시는 로그인 + role 검사를 통과한 요청만 코어 엔진으로 전달
- `/admin`은 middleware 쿠키 게이트 + 서버측 RBAC 이중 검사
- 외부 fetch는 timeout/retry 사용 (`fetchWithRetry`)
- 후원 링크는 allowlist 필터링으로 오배치/피싱 위험 완화

## Cloudflare 배포

- OpenNext 설정: `open-next.config.ts`
- Worker 설정: `wrangler.jsonc`
- CI 워크플로우: `.github/workflows/deploy-cloudflare.yml`

### 배포 워크플로우 필수 GitHub Secrets

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CORE_ENGINE_URL`
- `CORE_ENGINE_API_TOKEN`
- `NEXT_PUBLIC_PAYPAL_DONATION_URL`
- `ADMIN_ALLOWED_EMAILS` *(권장: secret 또는 repo variable로 관리)*

## 트러블슈팅 (자주 보는 에러)

- `CORE_ENGINE_URL is missing`
  - 포털 런타임에 `CORE_ENGINE_URL`이 비어있다는 뜻
  - `[GitHub Actions]` Repository Secret + `[Cloudflare Dashboard]` 런타임 변수 모두 확인 필요
  - 값 형식 예시: `http://<ec2-public-dns>:8000`
