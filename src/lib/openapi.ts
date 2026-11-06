const lead = { $ref: "#/components/schemas/Lead" };
const err = { description: "Error", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } };
const ok = (schema: object, description = "OK") => ({ description, content: { "application/json": { schema: { type: "object", properties: { data: schema } } } } });
const sec = (scope: string) => [{ bearer: [scope] }];

export function openapi(server: string) {
  return {
    openapi: "3.1.0",
    info: {
      title: "Velaroute API",
      version: "1.0.0",
      description: "Push leads through the inbound pipeline (guard → enrich → match → route → book → CRM → SLA), read results and act on them. Authenticate with `Authorization: Bearer <API key>` — create keys in **Settings → API keys**. Rate limit: 120 requests/minute per key.",
    },
    servers: [{ url: server }],
    components: {
      securitySchemes: { bearer: { type: "http", scheme: "bearer", description: "API key, e.g. vr_live_…" } },
      schemas: {
        Error: { type: "object", properties: { error: { type: "object", properties: { status: { type: "integer" }, title: { type: "string" }, detail: { type: "string" } } } } },
        LeadInput: { type: "object", required: ["email"], properties: { email: { type: "string", format: "email" }, name: { type: "string" }, company: { type: "string" }, title: { type: "string" }, message: { type: "string" }, source: { type: "string", enum: ["api", "form", "chat", "email"] } } },
        Lead: {
          type: "object",
          properties: {
            id: { type: "string" }, createdAt: { type: "string", format: "date-time" }, source: { type: "string" }, name: { type: "string" }, email: { type: "string" }, company: { type: "string" },
            stage: { type: "string", enum: ["new", "working", "meeting", "qualified", "won", "lost", "spam"] }, icpScore: { type: "integer" },
            guard: { type: "object", properties: { score: { type: "integer" }, verdict: { type: "string", enum: ["pass", "review", "block"] }, reasons: { type: "array", items: { type: "string" } } } },
            owner: { type: ["object", "null"], properties: { id: { type: "string" }, name: { type: "string" }, email: { type: "string" } } },
            routeReason: { type: ["string", "null"] },
            sla: { type: "object", properties: { dueAt: { type: ["string", "null"] }, firstTouchAt: { type: ["string", "null"] }, breachedAt: { type: ["string", "null"] }, escalatedAt: { type: ["string", "null"] } } },
            meeting: { type: ["object", "null"] }, enrichment: { type: ["object", "null"] },
            trace: { type: "array", items: { type: "object", properties: { step: { type: "string" }, ok: { type: "boolean" }, detail: { type: "string" }, ms: { type: "integer" } } } },
          },
        },
        Rule: { type: "object", required: ["name", "repIds"], properties: { id: { type: "string" }, name: { type: "string" }, priority: { type: "integer" }, enabled: { type: "boolean" }, match: { type: "string", enum: ["all", "any"] }, conditions: { type: "array", items: { type: "object", properties: { field: { type: "string", enum: ["country", "region", "employees", "domain", "industry", "icpScore", "source", "answer"] }, op: { type: "string", enum: ["equals", "in", "gte", "lte", "contains", "ends_with"] }, value: { type: "string" }, key: { type: "string" } } } }, repIds: { type: "array", items: { type: "string" } } } },
        Slot: { type: "object", properties: { start: { type: "string", format: "date-time" }, end: { type: "string", format: "date-time" } } },
      },
    },
    paths: {
      "/api/v1/me": { get: { tags: ["Account"], summary: "Who am I", security: sec("leads:read"), responses: { 200: ok({ type: "object" }), 401: err } } },
      "/api/v1/leads": {
        get: { tags: ["Leads"], summary: "List leads", security: sec("leads:read"), parameters: [{ name: "stage", in: "query", schema: { type: "string" } }, { name: "ownerId", in: "query", schema: { type: "string" } }, { name: "limit", in: "query", schema: { type: "integer", maximum: 100 } }], responses: { 200: ok({ type: "array", items: lead }), 401: err } },
        post: { tags: ["Leads"], summary: "Create a lead (runs the full pipeline)", security: sec("leads:write"), requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/LeadInput" } } } }, responses: { 201: ok(lead, "Created and routed"), 400: err, 401: err, 403: err } },
      },
      "/api/v1/leads/{id}": {
        get: { tags: ["Leads"], summary: "Get a lead with its pipeline trace", security: sec("leads:read"), parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { 200: ok(lead), 404: err } },
        patch: { tags: ["Leads"], summary: "Change stage or owner", security: sec("leads:write"), parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], requestBody: { content: { "application/json": { schema: { type: "object", properties: { stage: { type: "string" }, ownerId: { type: "string" } } } } } }, responses: { 200: ok(lead), 400: err, 404: err } },
      },
      "/api/v1/leads/{id}/touch": { post: { tags: ["Leads"], summary: "Log a first touch (stops the SLA clock)", security: sec("leads:write"), parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], requestBody: { content: { "application/json": { schema: { type: "object", properties: { kind: { type: "string", enum: ["email", "call", "linkedin", "note"] }, text: { type: "string" } } } } } }, responses: { 200: ok(lead), 400: err } } },
      "/api/v1/leads/{id}/slots": { get: { tags: ["Meetings"], summary: "Free slots on the owner's calendar", security: sec("leads:read"), parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { 200: ok({ type: "object", properties: { rep: { type: "object" }, slots: { type: "array", items: { $ref: "#/components/schemas/Slot" } } } }), 404: err } } },
      "/api/v1/leads/{id}/book": { post: { tags: ["Meetings"], summary: "Book a meeting with the owner", security: sec("meetings:write"), parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["start"], properties: { start: { type: "string", format: "date-time" } } } } } }, responses: { 201: ok({ type: "object" }), 400: err } } },
      "/api/v1/rules": {
        get: { tags: ["Routing"], summary: "List routing rules", security: sec("routing:read"), responses: { 200: ok({ type: "array", items: { $ref: "#/components/schemas/Rule" } }) } },
        post: { tags: ["Routing"], summary: "Create a routing rule", security: sec("routing:write"), requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/Rule" } } } }, responses: { 201: ok({ $ref: "#/components/schemas/Rule" }), 400: err } },
      },
      "/api/v1/route/test": { post: { tags: ["Routing"], summary: "Explain where a lead would route (dry run)", security: sec("routing:read"), requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["email"], properties: { email: { type: "string" }, title: { type: "string" } } } } } }, responses: { 200: ok({ type: "object" }), 400: err } } },
      "/api/v1/reps": { get: { tags: ["Routing"], summary: "List reps with weights and availability", security: sec("routing:read"), responses: { 200: ok({ type: "array", items: { type: "object" } }) } } },
      "/api/v1/analytics": { get: { tags: ["Analytics"], summary: "Speed-to-lead, SLA, fairness and spend", security: sec("analytics:read"), parameters: [{ name: "days", in: "query", schema: { type: "integer", minimum: 1, maximum: 90 } }], responses: { 200: ok({ type: "object" }) } } },
      "/api/inbound/email": { post: { tags: ["Capture"], summary: "Email-to-lead (inbound parse webhook)", security: sec("leads:write"), requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["from"], properties: { from: { type: "string" }, fromName: { type: "string" }, subject: { type: "string" }, text: { type: "string" } } } } } }, responses: { 201: { description: "Lead created" }, 400: err } } },
      "/api/mcp": { post: { tags: ["MCP"], summary: "MCP server (JSON-RPC 2.0, Streamable HTTP)", security: sec("leads:read"), requestBody: { required: true, content: { "application/json": { schema: { type: "object" } } } }, responses: { 200: { description: "JSON-RPC response" } } } },
      "/api/health": { get: { tags: ["Status"], summary: "Health checks", security: [], responses: { 200: { description: "ok / degraded" }, 503: { description: "down" } } } },
      "/api/status": { get: { tags: ["Status"], summary: "Public status with 24h history", security: [], responses: { 200: { description: "Status" } } } },
    },
  };
}
