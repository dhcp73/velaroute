# Velaroute visual system

## Direction
True white, charcoal and a saturated dark orange. One contemporary grotesque is used across marketing, auth and the operations workspace. Slite informed the clean navigation, whitespace and product-first hierarchy only; no third-party logos, slogans, copy, illustrations or distinctive product chrome are used.

- Typography throughout: Plus Jakarta Sans, weights 400–800. No display serif or italic headlines.
- Light: white `#ffffff`, neutral off-white `#f7f8fa`, charcoal `#17191c`, cool dividers `#e5e7eb`.
- Dark: charcoal `#101216`, surface `#181b20`, readable cool white.
- Accent: saturated dark orange `#cf3f16`, with darker hover `#b93411`. White CTA labels retain accessible contrast. Green/amber/red are reserved for meaningful status.
- Primary actions are orange pills; secondary actions are quiet, bordered and neutral.
- The product preview uses a light software window, not a dark editorial frame. Example data is explicitly labelled.
- The homepage keeps six core feature cards rather than a long wall of nine; the full product page remains available.
- No decorative orbs, grids, textures, scrolling integration-pill marquees or rainbow headlines.
- Shared min-width constraints keep dashboard and developer grids inside mobile viewports.

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
- `BASE_URL=http://localhost:3307 npm run test:e2e`: all marketing routes and key workspace routes at 375/1280px, sans font/white-orange tokens/dark mode, mobile navigation, demo sign-in, sandbox provider connection, and plan switching with reload persistence. Interactive tests are restricted to localhost.
- `BASE_URL=http://localhost:3307 npm run screenshots`: refreshed real app screenshots in `public/docs/screens`, plus marketing/app QA images in ignored `reports/screens`.

End-to-end tests cover the redesigned flows, not every pre-existing integration against paid/live provider APIs.
