# Account deletion

## Background
- iis game portal uses Supabase Auth and `profiles` roles (`master_admin`, `creator`).
- Workspace sessions, prompts/events, publish history, and created game metadata can be tied to a profile.
- Production deployment already injects `SUPABASE_SERVICE_ROLE_KEY` for server-side admin operations.

## Goal
- Let an authenticated non-master creator withdraw their own account.
- Delete creator workspace session data and auth/profile records.
- Preserve public games while removing the `created_by` profile link.

## Non-goals
- Do not allow `master_admin` self-delete in this pass, to avoid locking out operations.
- Do not delete leaderboard rows or play-event fingerprint hashes because those are public gameplay data, not login-account rows.
- Do not call external core-engine destructive APIs.

## Scope
- `DELETE /api/account`
- Nav account UI confirmation panel.

## Constraints
- Write route must validate same-origin `Origin`.
- Service role stays server-side.
- Deletes must be scoped to current authenticated user only.

## Affected contracts
- API: new authenticated same-origin `DELETE /api/account`.
- DB: deletes child session rows, sessions, profile, auth user; nulls `games_metadata.created_by` for the user.
- Frontend state: on success signs out and redirects home.

## Core logic
1. Validate write origin.
2. Resolve current Supabase user and profile role.
3. Block `master_admin`.
4. Using admin client, find user sessions and delete child tables before deleting sessions.
5. Set `games_metadata.created_by = null` for the user.
6. Delete profile and auth user.

## Pseudocode
```text
origin = validateTrustedWriteOrigin(request)
if !origin.ok: 403
user = server.auth.getUser()
if !user: 401
role = profiles.role where id=user.id
if role == master_admin: 403
sessionIds = select sessions.id where user_id=user.id
delete session_events/conversation_history/session_publish_history where session_id in sessionIds
delete sessions where user_id=user.id
update games_metadata set created_by=null where created_by=user.id
delete profiles where id=user.id
admin.auth.admin.deleteUser(user.id)
return { ok: true, deleted: true }
```

## Breadboard / shaped flow
- Header account block shows `계정 탈퇴` for authenticated users.
- Clicking opens inline warning and typed confirmation.
- User types `탈퇴` to enable deletion.
- Master admin sees the action disabled with a short explanation.

## Edge cases
- Missing/invalid origin -> 403.
- Unauthenticated -> 401.
- Master admin -> 403.
- Partial Supabase failure -> 500 and error code; deletion does not continue after failed DB step.

## Task breakdown
- Add route and tests.
- Add client UI component and wire it into nav account.
- Run lint/typecheck/test/build.

## Verification plan
- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build`

## Open questions / assumptions
- Created public games are preserved and dissociated from the deleted profile rather than deleted.
