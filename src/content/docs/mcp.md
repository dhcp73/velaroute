---
title: MCP server
description: Let your own AI agents route, query and book leads through the Model Context Protocol.
---
Velaroute exposes an MCP server over Streamable HTTP at `/api/mcp`, authenticated with an API key.

## Connect a client

```json
{
  "mcpServers": {
    "velaroute": {
      "url": "https://YOUR_HOST/api/mcp",
      "headers": { "Authorization": "Bearer vr_demo_7Kq2Lm9Xp4Rt8Wz3" }
    }
  }
}
```

For stdio-only clients, run the bundled bridge locally:

```bash
VELAROUTE_URL=http://localhost:3300 VELAROUTE_KEY=vr_demo_7Kq2Lm9Xp4Rt8Wz3 npm run mcp
```

## Tools

| Tool | Does |
| --- | --- |
| `list_leads` | List recent leads, filtered by stage or owner |
| `get_lead` | One lead with its full pipeline trace |
| `create_lead` | Run a lead through the full pipeline |
| `explain_route` | Dry-run the router for an email and explain who would get it |
| `get_sla_breaches` | Leads whose first-touch SLA is breached |
| `get_free_slots` | Owner's free meeting slots |
| `book_meeting` | Book a slot with the owner |
| `update_stage` | Move a lead to a new stage |
| `log_touch` | Record a first touch (stops the SLA clock) |
| `get_analytics` | Speed-to-lead, SLA rate, fairness, spend |
| `list_rules` | Routing rules and round-robin pools |

Write tools go through the same pipeline as the UI: guard, caps and SLA always apply.

![MCP settings](/docs/screens/developers.png)
