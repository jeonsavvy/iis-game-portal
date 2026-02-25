# Design Guardrails

## Global
- Build hierarchy with structure/spacing/typography before color
- Never emphasize all modules at once
- Avoid panel-in-panel-in-panel nesting unless functional necessity
- Respect reduced-motion users via `prefers-reduced-motion`

## Forbidden Patterns
- Generic SaaS hero + 3 cards + dominant CTA landing pattern
- Oversized filter panel taking first screen priority
- Neon/glow overuse that weakens signal semantics
- Status chips / badges overcrowding
- Duplicate information blocks without new value

## Public Arcade
- Content/visuals lead, UI controls follow
- One primary action per card
- Keep browsing density high but breathable
- Avoid admin-console visual language

## Ops Console
- Signal system must remain deterministic
- Success/running/warning/error are reserved semantic colors
- Decorative elements cannot reduce control clarity
- Dangerous controls fixed in placement and interaction flow

## Destructive Actions
- Require at least two explicit user confirmations
- Show irreversible consequence before action
- Preserve contextual state on failure
- Always provide actionable next step after failure
