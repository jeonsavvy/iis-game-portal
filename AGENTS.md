# AGENTS.md

## Purpose

IIS Game Portal is the public Cloudflare/OpenNext frontend for game catalog, play pages, creator workspace, admin views, and the BFF to IIS Core Engine.

## Structure

- `app/`: Next.js routes and UI.
- `lib/`: auth, BFF, artifact proxy, and domain logic.
- `tests/` and `*.test.*`: unit/integration coverage.
- `wrangler.jsonc` and `open-next.config.ts`: Cloudflare/OpenNext deployment config.

## Safe commands

```bash
npm ci
npm run lint
npm run typecheck
npm test
npm run build
```

Run `npm run test:e2e` only when browser dependencies and target environment are ready.

## Risk boundaries

- Do not deploy, change Cloudflare vars/secrets, write Supabase data, or call Core Engine mutating endpoints without explicit approval.
- Do not expose `SUPABASE_SERVICE_ROLE_KEY`, `CORE_ENGINE_API_TOKEN`, Cloudflare tokens, or OAuth credentials.
- Treat `/admin`, `/workspace`, artifact proxy, iframe sandboxing, and BFF routes as high-risk surfaces.

## Reporting

Report changed files, verification commands, pass/fail status, and production smoke/rollback notes.
