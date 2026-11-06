---
title: Enrichment & spend caps
description: The Apollo → Clay → Valyu waterfall, caps, caching and the spend ledger.
---
Enrichment adds company size, industry, country and title to a lead so routing and scoring have something to work with.

## The waterfall

Providers run in order and stop at the first complete answer:

| Provider | Typical use | Default cost per call |
| --- | --- | --- |
| Apollo | Person + company match by email | $0.05 |
| Clay | Webhook table enrichment | $0.08 |
| Valyu | Web search research fallback | $0.10 |

Costs are configurable estimates used for the cap; your provider bills you directly.

## Caps

Two caps are checked **before** every paid call:

- **Per-lead cap** (default 15¢) — stops the waterfall if the next call would exceed it.
- **Monthly cap** (default $50) — once reached, new leads are routed on form data only.

## Cache

Results are cached by domain for 30 days, so the second person from the same company costs nothing.

## Ledger

Every call is recorded with provider, lead, cost and outcome. **Analytics** shows spend by provider and cost per booked meeting.

![Enrichment settings](/docs/screens/settings.png)

## Sandbox vs. live

Without keys, providers are simulated with deterministic results so the pipeline behaves realistically. Add a key in **Settings → Integrations** and the provider switches to live calls.
