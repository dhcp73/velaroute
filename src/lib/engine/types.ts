export type Stage = "new" | "working" | "meeting" | "qualified" | "won" | "lost" | "spam";
export const STAGES: Stage[] = ["new", "working", "meeting", "qualified", "won", "lost", "spam"];
export type Source = "form" | "chat" | "email" | "api" | "booking";

export interface Rep {
  id: string;
  name: string;
  email: string;
  title: string;
  team: "smb" | "midmarket" | "enterprise" | "emea";
  region: string; // e.g. "NA", "EMEA", "APAC"
  weight: number; // 0 pauses the rep in round robin
  available: boolean; // false = OOO, skipped
  capacityPerDay: number;
  timezone: string;
  workStart: number; // hour, rep-local
  workEnd: number;
  calendar: "google" | "microsoft" | "none";
  color: string;
}

export interface Account {
  id: string;
  domain: string;
  name: string;
  ownerId: string;
  employees: number;
  country: string;
  industry: string;
  stage: "customer" | "open_opp" | "prospect";
}

export type FieldType = "text" | "email" | "select" | "number" | "textarea" | "buttons" | "checkbox";
export interface FormField {
  id: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: string[];
  placeholder?: string;
}
export interface FormStep {
  id: string;
  title: string;
  fields: FormField[];
}
export type LogicOp = "equals" | "not_equals" | "contains" | "gte" | "lte" | "filled" | "empty";
export interface LogicRule {
  id: string;
  stepId: string;
  fieldId: string;
  op: LogicOp;
  value: string;
  goto: string; // step id or "submit"
}
export interface Form {
  id: string;
  name: string;
  slug: string;
  status: "live" | "draft";
  steps: FormStep[];
  logic: LogicRule[];
  showBooking: boolean;
  createdAt: string;
  submissions: number;
  views: number;
}

export type RouteField = "country" | "region" | "employees" | "domain" | "industry" | "icpScore" | "source" | "answer";
export type RouteOp = "equals" | "in" | "gte" | "lte" | "contains" | "ends_with";
export interface RouteCondition { field: RouteField; op: RouteOp; value: string; key?: string }
export interface RoutingRule {
  id: string;
  name: string;
  priority: number;
  enabled: boolean;
  match: "all" | "any";
  conditions: RouteCondition[];
  repIds: string[]; // pool for weighted round robin
  hits: number;
}

export interface GuardResult { score: number; verdict: "pass" | "review" | "block"; reasons: string[] }
export interface Enrichment {
  provider: string;
  costCents: number;
  cached: boolean;
  company?: { name: string; domain: string; employees: number; country: string; region: string; industry: string; funding?: string; tech?: string[] };
  person?: { title?: string; seniority?: string; linkedin?: string };
  skipped?: string;
}
export interface TraceStep { step: string; ok: boolean; detail: string; ms: number }
export interface Meeting { id: string; repId: string; start: string; end: string; link: string; provider: string; status: "booked" | "held" | "no_show" | "cancelled" }
export interface Activity { at: string; type: string; text: string; by?: string }

export interface Lead {
  id: string;
  createdAt: string;
  source: Source;
  formId?: string;
  name: string;
  email: string;
  company: string;
  domain: string;
  title?: string;
  message?: string;
  answers: Record<string, string>;
  utm?: Record<string, string>;
  guard: GuardResult;
  enrichment?: Enrichment;
  accountId?: string;
  duplicateOf?: string;
  icpScore: number;
  ownerId?: string;
  ruleId?: string;
  routeReason?: string;
  stage: Stage;
  meeting?: Meeting;
  slaDueAt?: string;
  firstTouchAt?: string;
  slaBreachedAt?: string;
  slaWarnedAt?: string;
  escalatedAt?: string;
  trace: TraceStep[];
  activities: Activity[];
  crmId?: string;
  value?: number;
}

export interface Alert { id: string; at: string; leadId: string; kind: "sla_warning" | "sla_breach" | "escalation" | "new_lead" | "spend_cap"; channel: "slack" | "email" | "webhook" | "in_app"; text: string; read: boolean }
export interface CrmEvent { id: string; at: string; leadId: string; system: "hubspot" | "salesforce" | "attio"; action: string; status: "ok" | "skipped" | "error"; detail: string }
export interface Webhook { id: string; url: string; events: string[]; secret: string; active: boolean; createdAt: string }
export interface WebhookDelivery { id: string; webhookId: string; event: string; at: string; status: number; ok: boolean; ms: number }
export interface ApiKey { id: string; name: string; prefix: string; hash: string; scopes: string[]; createdAt: string; lastUsedAt?: string; revoked?: boolean }
export interface SpendEntry { at: string; leadId: string; provider: string; cents: number }

export type ProviderId = "openai" | "openrouter" | "anthropic" | "apollo" | "clay" | "valyu" | "hubspot" | "salesforce" | "attio" | "slack" | "google" | "microsoft";
export interface Integration { id: ProviderId; connected: boolean; keyHint?: string; secret?: string; config?: Record<string, string>; updatedAt?: string }

export interface Settings {
  slaMinutes: number;
  escalateAfterMinutes: number;
  monthlySpendCapCents: number;
  perLeadCapCents: number;
  botBlockScore: number;
  botReviewScore: number;
  blockDisposable: boolean;
  enrichOrder: ProviderId[];
  crmTarget: "hubspot" | "salesforce" | "attio";
  slackChannel: string;
  aiModel: string;
  aiProvider: "openai" | "openrouter" | "anthropic";
  icpMinEmployees: number;
  icpMaxEmployees: number;
  icpIndustries: string[];
  icpRegions: string[];
  bookingWindowDays: number;
  meetingMinutes: number;
}

export interface Workspace {
  id: string;
  name: string;
  plan: "launch" | "scale" | "command";
  createdAt: string;
  version: number;
  reps: Rep[];
  accounts: Account[];
  forms: Form[];
  rules: RoutingRule[];
  rrState: Record<string, Record<string, number>>; // smooth weighted RR current weights per rule
  leads: Lead[];
  alerts: Alert[];
  crm: CrmEvent[];
  webhooks: Webhook[];
  deliveries: WebhookDelivery[];
  apiKeys: ApiKey[];
  spend: SpendEntry[];
  integrations: Integration[];
  settings: Settings;
  audit: Activity[];
  lastTickAt?: string;
}

export interface LeadInput {
  source: Source;
  formId?: string;
  name?: string;
  email: string;
  company?: string;
  title?: string;
  message?: string;
  answers?: Record<string, string>;
  utm?: Record<string, string>;
  honeypot?: string;
  elapsedMs?: number; // time spent on the form
  ip?: string;
}
