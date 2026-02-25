# IIS Arcade / Studio Console PRD

## 1. Product Surfaces

### Public Arcade
- Goal: discovery speed, play conversion
- Core UX: hero curation, large game visuals, low-friction play CTA
- Anti-goal: dashboard-like management appearance

### Studio Console (Ops)
- Goal: state awareness, precise control, fast intervention
- Core UX: pipeline observability + control + collaboration legibility
- Anti-goal: decorative cyber UI that harms readability

## 2. Success Criteria

### Public Arcade
- First screen is content-led (hero/game visual > filter UI)
- Quick Discover is secondary and compact
- Cards are visually large and attractive
- Primary CTA priority is unambiguous

### Game Detail / Play
- Play viewport dominates first screen
- Metadata is concise and non-redundant
- AI/system-originated info is secondary (tab/accordion)

### Ops Console
- Multi-agent collaboration is immediately understandable
- Control actions (Pause/Resume/Stop/Retry) are unambiguous
- Logs and status remain readable under load
- Dangerous actions have clear friction and confirmation

## 3. IA Decisions

### Home
1. Global nav
2. Hero showcase
3. Quick discover bar
4. Playable now section
5. Latest creations section
6. Genre exploration section
7. Curator/experimental picks
8. Recently updated section

### Game Detail
1. Header + core actions
2. Dominant play viewport
3. Slim key metadata
4. User-centric tabs (controls/overview/screenshots/similar)
5. Collapsible AI/system notes

### Ops
1. Ops header + summary strip
2. Command control bar
3. 3-column body: collaboration graph / workbench / live logs
4. Utility row: trigger, approvals, failures, archive/delete

## 4. Constraints
- Keep current Next.js App Router stack
- No new dependencies
- No DB schema migration
- Preserve existing API contracts

## 5. Feature Flags / Runtime Defaults
- `FEATURED_GAME_SLUG`: optional, used for hero curation override
- If missing or invalid, fallback to latest playable game
