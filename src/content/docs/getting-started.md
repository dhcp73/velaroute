---
title: Getting started
description: Create a workspace, connect a form and route your first lead in about ten minutes.
---
Velaroute takes every inbound lead through one pipeline: **capture → guard → enrich → match → route → book → CRM sync → SLA**. This guide gets a workspace from zero to a routed, booked lead.

## 1. Try the demo first (optional)

Log in at [/login](/login) with `demo@velaroute.dev` / `demo1234` to explore a workspace with ~100 realistic leads, six reps, rules and live SLA timers. Use `admin@velaroute.dev` / `admin1234` for the admin view.

![The overview dashboard](/docs/screens/overview.png)

## 2. Create your workspace

Sign up at [/signup](/signup). You'll get a workspace pre-loaded with sample reps, forms and rules so the pipeline works immediately. Your own user is added as the first rep.

Everything starts in **sandbox mode**: enrichment and AI return realistic simulated results, so you can test without API keys.

## Build with Agents

Open [Agents](/app/agents) to describe a workflow instead of starting from a blank editor. For example:

- “Build a two-step demo form with company size and budget.”
- “Enterprise leads in Germany go to Jonas, everyone else round-robin.” The builder asks for an explicit employee threshold instead of guessing.
- “Apollo then Valyu, 50 cents per lead, $100 per month.”
- “Set SLA to 5 minutes and guard block at 80 and review at 40.”

The builder inspects your actual forms, reps and settings, then shows tool activity and a structured proposal. The Thought/Action/Observation cards contain short action summaries, not hidden model reasoning. **Confirm & save** applies the proposal through the same workspace actions as the manual builders. Nothing changes just because the agent proposes it. Discarded proposals do nothing; stale proposals ask for a fresh review instead of overwriting manual edits.

Confirmed forms appear in **Forms** as drafts; open the editor to check branching and publish. Confirmed routing rules appear in **Routing** and settings in **Settings**. The eight pipeline agents remain below the chat with run counts and configure links. Your current conversation and proposal statuses stay in this browser across reloads.

Connect a key in **Settings → Integrations** to use live AI. OpenRouter is preferred when connected; otherwise the configured OpenAI or Anthropic provider is used. The model is chosen in **Settings**. Connected Valyu exposes a company-research tool when you request research. Provider usage can consume your own credits.

Without a live key (including sandbox integrations), a deterministic demo planner still builds forms, routing and enrichment/guard/SLA proposals. It uses the same validation and confirmation path. Live provider failures are labeled as a demo fallback; unavailable Valyu research never invents sources. Ambiguous or unsupported requests need clarification or the manual editors.

![The Agents workspace builder](/docs/screens/agents.png)

## 3. Add your team

Go to **Routing → Team**. For each rep set:

- **Weight** — their share of round robin (e.g. 100 for full-time, 60 for three days a week)
- **Time zone and working hours** — used for both routing and bookable slots
- **Daily capacity** and **away** status

## 4. Publish a form

Open **Forms**, pick *Book a demo* and adjust the steps. Use **Share** to copy the hosted link, an iframe embed or the JS snippet. Branching logic lets you skip or show steps based on answers.

![The form builder](/docs/screens/form-builder.png)

## 5. Submit a test lead

Open the hosted form, fill it in with a work email and submit. You'll see the assigned rep's open slots — book one. Back in the app, open the lead from the **Inbox** to see its full trace.

![A lead with its pipeline trace](/docs/screens/lead.png)

## 6. Go live

- Add real keys in **Settings → Integrations** (Apollo, Clay, Valyu, OpenAI, Anthropic, OpenRouter, HubSpot, Slack).
- Set your SLA window and spend caps in **Settings**.
- Create an API key in **Settings → Developers** if you want to push leads from other systems.
