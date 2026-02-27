# Design / Delivery Checklist

## Public Arcade Home
- [x] Hero is the first-screen focal point
- [x] Quick Discover bar is compact and secondary
- [x] Game cards are large enough to prioritize visuals
- [x] Card copy is concise (no dense metadata)
- [x] At least one curated rail exists beyond flat listing

## Game Detail / Play
- [x] Play viewport has dominant visual weight
- [x] Header actions are clearly prioritized
- [x] Metadata repetition removed
- [x] User-oriented information grouped under tabs
- [x] AI/system commentary moved to secondary area

## Ops Console
- [x] A+C hybrid visible across full surface
- [x] 3-column structure preserved (graph/workbench/log)
- [x] Semantic status colors limited to success/running/warning/error
- [x] Control actions remain obvious under visual load
- [x] Log feed remains readable and scannable

## Observability / Delete
- [x] Table legibility improved (density/alignment/contrast)
- [x] Danger zone visually isolated
- [x] Destructive action requires explicit confirmations
- [x] Post-action result messaging is clear

## Verification
- [x] npm run lint
- [x] npm run typecheck
- [x] npm test
- [x] npm run test:e2e
- [x] UI checklist E2E (`e2e/ui-checklist.spec.ts`)
- [x] npm run build
- [x] Screenshot self-review completed for updated pages
