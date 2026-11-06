# Velaroute visual system

## Direction
Warm paper, near-black ink, and a single copper signal. Editorial marketing and a precise, readable operations workspace share the same tokens. Reference sites informed craft and hierarchy only; no third-party logos, mascots, copy or illustrations are used.

- Body and UI: IBM Plex Sans, 400–700.
- Marketing h1/h2 and auth titles: Instrument Serif, regular/italic.
- Light: paper `#f7f6f2`, ink `#191918`, stone dividers `#deddd5`.
- Dark: ink `#141413`, surface `#1c1c1a`, readable warm white.
- Accent: copper `#985a30`; green/amber/red are reserved for meaningful status.
- Primary actions are ink, inputs have 6px corners, cards 10px, chips 4px.
- No gradient headlines, decorative grids, floating orbs, or scrolling provider pills.
- The hero preview is labelled sample data; it is not a customer testimonial.

## Billing consistency
`src/lib/plans.ts` is the shared source for marketing and workspace settings:

| ID | Plan | Monthly | Reps | Leads/month |
| --- | --- | --- | --- | --- |
| starter | Starter | $99 | 3 | 500 |
| growth | Growth | $249 | 15 | 2,500 |
| scale | Scale | $499 | 50 | 10,000 |

A versioned migration preserves existing saved tiers by price: legacy Launch → Starter, legacy Scale → Growth, legacy Command → Scale. Version 2 prevents a new Scale workspace from being migrated again. Both browser snapshots and server-loaded workspaces use the migration.

Billing remains a demo: no card is charged; quotas and usage emails are not enforced/configured. Browser storage remains enabled on Vercel. This design pass does not make the infrastructure customer-ready.

## Verification
- `npm run check`: typecheck, zero-warning lint, engine/crypto/pricing unit tests.
- `BASE_URL=http://localhost:3307 npm run test:e2e`: all marketing routes and key workspace routes at 375/1280px, font/tokens/dark mode, mobile navigation, demo sign-in, sandbox provider connection, and plan switching with reload persistence. Interactive tests are restricted to localhost.
- `BASE_URL=http://localhost:3307 npm run screenshots`: refreshed real app screenshots in `public/docs/screens`, plus marketing/app QA images in ignored `reports/screens`.

End-to-end tests cover the redesigned flows, not every pre-existing integration against paid/live provider APIs.
