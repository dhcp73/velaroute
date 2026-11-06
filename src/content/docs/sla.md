---
title: SLA agent
description: First-touch clocks, warnings, breach alerts and automatic re-routing.
---
Every routed lead that hasn't booked a meeting gets a **first-touch clock**.

## Timeline

| Moment | Default | What happens |
| --- | --- | --- |
| Routed | 0:00 | Clock starts, owner notified |
| Warning | 80% of window (4:00) | Owner gets a nudge |
| Breach | window (5:00) | Alert in the app and Slack |
| Escalation | +10 min | Lead re-routed to the next eligible rep |

## Stopping the clock

Any logged first response stops the clock: an email, a call, a booked meeting or a `touch` via the API (`POST /api/v1/leads/{id}/touch`).

## Configure

**Settings → SLA** sets the first-touch window and the escalation delay.

![The inbox with SLA timers](/docs/screens/inbox.png)

## How the tick runs

Locally, a background tick runs every 30 seconds. On Vercel, a cron job calls `/api/cron/tick`, and the app also ticks whenever a workspace is opened.
