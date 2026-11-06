---
title: Routing
description: Rules, round robin, account ownership and the route tester.
---
Routing decides who owns a lead. It runs after the guard and enrichment, so rules can use firmographic data.

## Order of decisions

1. **Duplicate** — the same email within 30 days is merged and keeps its owner.
2. **Account owner** — if the lead's domain matches an account with an owner, the owner gets it.
3. **Rules** — evaluated top to bottom; the first matching rule picks a team (a set of reps).
4. **Round robin** — a weighted pick among eligible reps in that team.
5. **Fallback** — if no rule matches, the default pool is used.

## Rules

Each rule has one or more conditions joined by **all** or **any**. Conditions can use:

| Field | Examples |
| --- | --- |
| `country`, `region` | `region = EMEA` |
| `employees` | `employees >= 200` |
| `industry` | `industry contains Fintech` |
| `icpScore` | `icpScore >= 70` |
| `source` | `source = chat` |
| any form answer | `answers.team_size = 51-200` |

![Routing rules](/docs/screens/routing.png)

## Weighted round robin

Velaroute uses *smooth weighted round robin*. Each eligible rep's score increases by their weight on every pick; the highest score wins and is reduced by the total weight. Reps are **ineligible** when they are away, outside working hours, at daily capacity or have weight 0. Each skip is written to the trace.

## Route tester

The **Route tester** on the Routing page dry-runs any hypothetical lead and shows which rule matched and who would get it — without creating a lead. The same tool is available as `POST /api/v1/route/test` and the MCP tool `explain_route`.
