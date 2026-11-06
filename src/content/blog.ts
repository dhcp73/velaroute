export type Post = { slug: string; title: string; excerpt: string; date: string; read: string; tag: string; body: string };

export const POSTS: Post[] = [
  {
    slug: "speed-to-lead-is-a-routing-problem",
    title: "Speed-to-lead is a routing problem, not a rep problem",
    excerpt: "Slow responses usually aren't about lazy reps. They're about leads with no owner, no clock and no path to a calendar.",
    date: "2026-11-03", read: "5 min", tag: "Inbound",
    body: `When a demo request sits for a day, the instinct is to blame the team. In our experience the cause is almost always structural: the lead had **no owner**, **no clock** and **no path to a calendar**.

## The numbers have been clear for years

In 2011 *Harvard Business Review* published a study of 2,241 US companies that measured how quickly they answered web leads. The average first response took **42 hours**, and companies that responded within an hour were nearly **seven times** as likely to qualify the lead as those that waited even one hour longer ([HBR, "The Short Life of Online Sales Leads"](https://hbr.org/2011/03/the-short-life-of-online-sales-leads)).

Fifteen years later, most teams know the stat. Far fewer have changed the system that produces slow responses.

## Where the hours actually go

Trace a slow lead backwards and you usually find:

1. **The queue.** The form posts into a shared inbox or a CRM view nobody owns.
2. **The assignment.** Someone assigns leads by hand, or by a round-robin sheet that is out of date the day a rep goes on holiday.
3. **The back-and-forth.** The rep emails "what time works for you?" and waits.
4. **The silence.** Nobody notices a missed lead until the pipeline review.

None of those are effort problems. Each is a missing piece of routing.

## What fixing it looks like

- **Assign an owner in the same second the form is sent.** Rules for territories, round robin for everything else, account owners for existing customers.
- **Offer the owner's calendar on submit.** If the buyer qualifies, let them book right away instead of waiting for an email.
- **Start a clock.** Every lead that doesn't book gets a first-touch SLA. Warn the owner before it expires, alert the channel when it does, and re-route if nobody picks it up.

That's the loop Velaroute automates. The reps don't get faster; the system stops making them slow.`,
  },
  {
    slug: "guard-before-you-enrich",
    title: "Stop paying to enrich bots: put the guard before the waterfall",
    excerpt: "If enrichment runs on every submission, you're paying to learn that asdf@mailinator.com works at nowhere.",
    date: "2026-10-28", read: "4 min", tag: "Enrichment",
    body: `Enrichment providers price per lookup. Run them on every form fill and a chunk of your budget goes on bots, students and competitors.

## Order matters

The cheapest enrichment call is the one you never make. In Velaroute the pipeline order is fixed on purpose: **guard → enrich → match → route**. Nothing is spent until a submission passes the guard.

## What the guard checks

- **Honeypot fields** that humans never see and simple bots always fill.
- **Fill time.** A ten-field form completed in under two seconds wasn't typed by a person.
- **Disposable domains** like mailinator and guerrillamail.
- **Spam phrases** — SEO offers, link-building pitches, crypto.
- **Free-mail addresses**, which aren't blocked but are scored, because a gmail address on a "Book a demo" form is a weaker signal.

Each check adds to a 0–100 risk score. Above your block threshold the lead is marked as spam and costs nothing. In the grey zone it goes to a review queue with the reasons spelled out.

## Then cap what's left

For leads that pass, the enrichment waterfall runs Apollo, then Clay, then Valyu, and stops at the first complete answer. Two caps apply before every call: a **per-lead** cap and a **monthly** cap. Results are cached by domain, so the fifth person from the same company is free.

Every call lands in a spend ledger with the provider, the lead and the cost — so when finance asks what enrichment costs per booked meeting, you have an answer.`,
  },
  {
    slug: "fair-round-robin",
    title: "Round robin that's actually fair",
    excerpt: "Simple rotation breaks the moment someone is on holiday, part-time or already drowning. Here's the algorithm we use instead.",
    date: "2026-10-21", read: "6 min", tag: "Routing",
    body: `"Round robin" sounds simple: A, B, C, A, B, C. Real teams break it immediately.

- Sofia works three days a week, so she should get roughly 60% of a full share.
- Liam is on holiday, so he should get nothing — and shouldn't be "owed" a pile of leads when he returns.
- Marcus already has twelve open leads and can't take more today.

## Smooth weighted round robin

Velaroute uses **smooth weighted round robin**, the same algorithm nginx uses to balance traffic. Each rep has a weight. On every pick, each eligible rep's running score increases by their weight; the rep with the highest score wins and has the total weight subtracted. The result is a sequence that honours the weights *and* spreads picks evenly instead of in bursts.

## Eligibility comes first

Before the algorithm runs, reps are filtered out if they are:

- marked **away**,
- outside their **working hours** in their own time zone,
- at their **daily capacity**, or
- set to weight **zero**.

Skipped reps are recorded in the lead's trace — "skipped Liam (away)" — so nobody has to guess.

## Owners beat rotation

Rotation is the fallback, not the first rule. If the lead's domain matches an account that already has an owner, the owner gets it. If the same person submitted in the last 30 days, the lead is merged and stays with the original rep.

## Prove it

The analytics page shows a fairness chart per rep against their weight. If the line drifts, you'll see it before the team does.`,
  },
  {
    slug: "sla-needs-escalation",
    title: "Your SLA needs an escalation, not a dashboard",
    excerpt: "A first-response SLA that nobody enforces is just a number on a slide. Make the system act when the clock runs out.",
    date: "2026-10-14", read: "4 min", tag: "SLA",
    body: `Most teams have a speed-to-lead target. Few have anything that happens when it's missed — other than a red number in next week's report.

## Three moments that matter

1. **Warning.** At 80% of the window, the owner gets a nudge. Most misses are forgetfulness, and a nudge fixes them.
2. **Breach.** When the window expires, the team channel gets an alert with the lead and the owner. Visibility is usually enough.
3. **Escalation.** If the lead is still untouched after the escalation window, it is **re-routed** to the next available rep, and the hand-off is written into the lead's trace.

## What counts as a touch

A touch is a logged first response: an email, a call or a booked meeting. In Velaroute any of these stops the clock, whether it happens in the app, via the API or from a CRM sync.

## Pick a window you can keep

A five-minute target is great for a team that sits on inbound all day. A founder doing demos might choose thirty. The point isn't the number; it's that the system acts when the number is missed.`,
  },
  {
    slug: "mcp-for-inbound",
    title: "Why we built an MCP server for inbound routing",
    excerpt: "Your agents should be able to ask who owns an account, test a route or book a meeting — without screen-scraping your CRM.",
    date: "2026-10-07", read: "5 min", tag: "Developers",
    body: `The **Model Context Protocol** (MCP) is an open standard for connecting AI applications to tools and data ([modelcontextprotocol.io](https://modelcontextprotocol.io)). We ship an MCP server with Velaroute because inbound is increasingly something agents participate in, not just humans.

## What the tools do

The Velaroute MCP server exposes the same operations as the REST API:

- \`list_leads\` and \`get_lead\` — search the inbox and read a lead with its full routing trace.
- \`explain_route\` — dry-run the router for an email address and see who would get it and why, without creating anything.
- \`create_lead\` — push a lead from any source through the full pipeline.
- \`get_free_slots\` and \`book_meeting\` — find the owner's free times and book one.
- \`log_touch\` and \`update_stage\` — record a first response or change stage.
- \`get_sla_breaches\`, \`list_rules\` and \`get_analytics\` — see what's overdue, the rules and the numbers.

## Why not just the API?

You can — every tool has a REST twin documented in OpenAPI. MCP simply removes the glue: point an MCP-capable client at \`/api/mcp\` with an API key and the tools appear, typed and described.

## Guardrails

Keys are scoped (\`leads:read\`, \`leads:write\`, \`meetings:write\` …), rate-limited and shown only once. Write tools go through the same pipeline as the UI, so an agent can't skip the guard, the spend cap or the SLA.`,
  },
  {
    slug: "agentic-gtm-without-the-black-box",
    title: "Agentic GTM without the black box",
    excerpt: "Small agents with single jobs and written traces beat one opaque AI that 'handles inbound'.",
    date: "2026-09-30", read: "4 min", tag: "Product",
    body: `"Agentic" is everywhere in go-to-market software right now. Too often it means one large model making decisions nobody can inspect.

## Our design rule

Every agent in Velaroute has **one job**, **deterministic inputs where possible** and a **written trace**:

| Agent | Job | Uses an LLM? |
| --- | --- | --- |
| Guard | Score bot and spam risk | No |
| Enricher | Run the provider waterfall within caps | No |
| Matcher | Find the account and duplicates | No |
| Router | Apply rules and round robin | No |
| Booker | Offer and book the owner's slots | No |
| CRM writer | Upsert contacts, owners and meetings | No |
| SLA agent | Warn, alert and re-route | No |
| Copilot | Summaries, research and reply drafts | Yes |

The decisions that move money and accounts are rules you can read. Language models are used where language is the job — summarising a lead, drafting a reply, researching an account — and their output is a suggestion a rep approves.

## Why it matters

When a lead goes to the wrong person, you should be able to open it and read exactly why, in plain English, in under ten seconds. That's the bar.`,
  },
];
