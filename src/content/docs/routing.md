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
| `domain` | `domain ends_with .acme.com` |
| `industry` | `industry contains Fintech` |
| `icpScore` | `icpScore >= 70` |
| `source` | `source = chat` |
| any form answer | `answers.team_size = 51-200` |

![Routing rules](/docs/screens/routing.png)

## Describe a rule

Open **Routing → Describe a rule** to draft from plain language alongside the manual builder. For example:

- “EMEA companies over 50 employees between Jonas and Sofia”
- “Germany leads go to Jonas, everyone else round-robin”
- “domain ends with .acme.com and ICP at least 80 go to Ava”
- “answer budget >= 5000 go to Jonas”

This is a local, key-free parser, not a paid language model. It resolves names against your actual team and asks for a full name when ambiguous. Labels such as “enterprise” need an explicit employee threshold; reply “at least 1000 employees” to refine the same draft. In this parser, “over” and “under” compile to inclusive `gte` and `lte` comparisons; the preview shows the exact operator.

Review the human summary, structured conditions, receiving reps and rule position. Specific rules default before existing rules; an explicit catch-all defaults after them. **Confirm & save rule** is the only action that changes routing. **Edit manually** opens the existing rule editor instead. Unsupported fields, exclusions and ambiguous mixed AND/OR groups require clarification or separate manual rules.

“Everyone else round-robin” does not silently create a second rule: unmatched leads continue through existing rules and the built-in fallback. Account owners, eligibility, capacity and weights still apply.

## Weighted round robin

Velaroute uses *smooth weighted round robin*. Each eligible rep's score increases by their weight on every pick; the highest score wins and is reduced by the total weight. Reps are **ineligible** when they are away, outside working hours, at daily capacity or have weight 0. Each skip is written to the trace.

## Route tester

The **Route tester** on the Routing page dry-runs any hypothetical lead and shows which rule matched and who would get it — without creating a lead. The same tool is available as `POST /api/v1/route/test` and the MCP tool `explain_route`.
