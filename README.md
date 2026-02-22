# iis-game-portal (IIS Arcade + Studio Console)

Next.js App Router portal for discovery, play, and admin operations.

## Pages

- `/` active game catalog (`games_metadata`) + genre/sort filters
- `/play/[id]` iframe player + leaderboard + score submit form
- `/admin` Studio Console (trigger history + manual stage approval + realtime pipeline logs + stage/status/agent filter + role-based controls)

## Key modules

- `lib/supabase/*`: browser/server/admin clients
- `lib/auth/rbac.ts`: role checks (`master_admin` single-operator mode)
- `types/pipeline.ts`: includes `Stylist` and `style`
- `app/api/pipelines/approve/route.ts`: manual stage approval proxy

## $1 donation CTA

- GNB shows `💖 $1 후원하기` links for Toss and PayPal.
- This is external-link only support UX (not an in-app payment system).
- URLs are validated against allowed hosts and HTTPS.

## Run

```bash
npm install
cp .env.example .env.local
npm run dev
```

## Security notes

- `SUPABASE_SERVICE_ROLE_KEY` is server-only; never expose it in client code.
- Trigger API route proxies to Repo1 and enforces auth + role checks.
- `/admin` route has middleware cookie gate before server-side RBAC check.
- External fetches use timeout and retry (`fetchWithRetry`).
- Donation links are allowlist-filtered to reduce phishing/misconfiguration risk.

## Cloudflare deployment

- OpenNext config: `open-next.config.ts`
- Worker config: `wrangler.jsonc`
- CI workflow: `.github/workflows/deploy-cloudflare.yml`

Required GitHub secrets for deploy workflow:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CORE_ENGINE_URL`
- `CORE_ENGINE_API_TOKEN`
- `NEXT_PUBLIC_TOSS_DONATION_URL`
- `NEXT_PUBLIC_PAYPAL_DONATION_URL`
