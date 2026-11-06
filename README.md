# Velaroute

Agentic inbound GTM engine: capture, guard, enrich, match, route, book, sync and SLA in one pipeline.

## Stack

- Next.js 15 + TypeScript + Tailwind
- Storage: SQLite locally (`STORAGE_MODE=sqlite`); in-memory + browser snapshot on Vercel (`STORAGE_MODE=browser`)

## Local

```bash
npm install
npm run dev          # http://localhost:3300
npm test
npm run check
```

Demo login: `demo@velaroute.dev` / `demo1234`

## Deploy

Production build on Vercel uses `STORAGE_MODE=browser` (see `vercel.json`). Set `SESSION_SECRET` and optionally `CRON_SECRET` / `PUBLIC_URL` in the project env.

## Repo

https://github.com/dhcp73/velaroute
