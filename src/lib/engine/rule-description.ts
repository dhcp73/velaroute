import type { Rep, RouteCondition, RouteField, RouteOp, RoutingRule } from "./types";

export type DescribedRule = Pick<RoutingRule, "name" | "enabled" | "match" | "conditions" | "repIds">;
export interface RuleDescription {
  draft: DescribedRule;
  questions: string[];
  notes: string[];
  fallback: boolean;
  needsSize: boolean;
  blocked: string[];
}
type TeamRep = Pick<Rep, "id" | "name" | "region" | "team">;
const COUNTRIES: [string, string][] = [
  ["germany|german", "DE"], ["france|french", "FR"], ["united kingdom|great britain|britain|british|uk", "GB"],
  ["united states|usa|u\\.s\\.|american", "US"], ["canada|canadian", "CA"], ["australia|australian", "AU"],
  ["netherlands|dutch", "NL"], ["spain|spanish", "ES"], ["italy|italian", "IT"], ["ireland|irish", "IE"],
  ["india|indian", "IN"], ["japan|japanese", "JP"], ["singapore", "SG"], ["united arab emirates|uae", "AE"],
  ["brazil|brazilian", "BR"], ["mexico|mexican", "MX"], ["south africa", "ZA"], ["sweden|swedish", "SE"],
  ["switzerland|swiss", "CH"], ["poland|polish", "PL"], ["norway|norwegian", "NO"], ["denmark|danish", "DK"],
  ["belgium|belgian", "BE"], ["austria|austrian", "AT"], ["new zealand", "NZ"], ["portugal|portuguese", "PT"],
  ["saudi arabia", "SA"], ["israel|israeli", "IL"],
];
const REGIONS: [string, string][] = [["emea", "EMEA"], ["north america|north american|na", "NA"], ["asia pacific|apac", "APAC"], ["latin america|latam", "LATAM"]];
const OPS: Record<string, RouteOp> = { ">=": "gte", ">": "gte", "over": "gte", "above": "gte", "at least": "gte", "more than": "gte", "minimum": "gte", "<=": "lte", "<": "lte", "under": "lte", "below": "lte", "at most": "lte", "up to": "lte", "less than": "lte", "maximum": "lte", "equals": "equals", "equal to": "equals", "is": "equals", "=": "equals", "contains": "contains", "ends with": "ends_with", "in": "in" };
const comparison = "at least|at most|more than|less than|up to|equal to|>=|<=|>|<|=|over|above|under|below|minimum|maximum|equals|is";
const escapeRE = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const normalize = (s: string) => s.toLowerCase().replace(/[’']/g, "").replace(/[^a-z0-9]+/g, " ").trim();
const has = (text: string, pattern: string) => new RegExp(`\\b(?:${pattern})\\b`, "i").test(text);
const unique = <T,>(xs: T[]) => [...new Set(xs)];

export function conditionDescription(c: RouteCondition): string {
  const field = ({ country: "Country", region: "Region", employees: "Employees", industry: "Industry", domain: "Domain", icpScore: "ICP score", source: "Source", answer: `Answer “${c.key ?? ""}”` })[c.field];
  const op = ({ equals: "is", in: "is one of", gte: "≥", lte: "≤", contains: "contains", ends_with: "ends with" })[c.op];
  return `${field} ${op} ${c.value}`;
}

/** Deterministic, key-free compiler for the supported routing fields. Never saves or invents a rep/threshold. */
export function parseRuleDescription(input: string, reps: TeamRep[], previous?: RuleDescription): RuleDescription {
  const text = input.trim().replace(/[“”]/g, '"').replace(/[’]/g, "'");
  const questions: string[] = [];
  const notes: string[] = [];
  const reset = /^(?:start over|new rule|reset)\b/i.test(text);
  const prior = reset ? undefined : previous;
  let blocked = /\b(?:ignore|drop|remove)\b/i.test(text) ? [] : [...(prior?.blocked ?? [])];
  const unsupported: [RegExp, string][] = [
    [/\b(?:revenue|arr|deal value|deal size|job title|seniority)\b/i, "That field is not available in routing conditions. Use a supported field or an explicit form answer (for example: answer budget >= 5000)."],
    [/\b(?:except|excluding|exclude|not equal|not in|is not)\b/i, "Negative/exclusion conditions are not supported by this rule type. Restate this with positive conditions, or create separate manual rules."],
    [/\b(?:hot|high.intent|high.value) leads?\b/i, "What ICP score should define those leads? Give an explicit threshold, such as ICP at least 80."],
  ];
  if (!/\b(?:ignore|drop|remove)\b/i.test(text)) for (const [pattern, message] of unsupported) if (pattern.test(text)) blocked.push(message);

  const fallbackIndex = text.search(/\b(?:everyone else|all other leads|otherwise|fall[ -]?back)\b/i);
  const fallback = fallbackIndex >= 0 || prior?.fallback || false;
  const primary = fallbackIndex > 0 ? text.slice(0, fallbackIndex) : text;
  const tail = fallbackIndex > 0 ? text.slice(fallbackIndex) : "";
  if (tail && !/round[ -]?robin/i.test(tail)) blocked.push("I can draft one rule at a time. Describe this rule first; the existing team round-robin fallback remains available.");
  if (tail && reps.some((r) => has(tail, escapeRE(r.name.split(" ")[0])))) blocked.push("A second named destination needs a separate rule. This draft only saves the first rule.");

  const assignment = /\b(?:go(?:es)?\s+to|send\s+to|route\s+to|assign\s+to|routed\s+to|to|between|among|across|add|use(?:\s+only)?|instead(?:\s+use)?)\s+([a-z][^;!?]*)$/i.exec(primary);
  let target = assignment?.[1] ?? primary;
  const targetCondition = target.search(/\b(?:for|when|where|if|with|in)\b/i);
  const extraCriteria = assignment && targetCondition >= 0 ? target.slice(targetCondition) : "";
  if (targetCondition >= 0 && assignment) target = target.slice(0, targetCondition);
  const criteria = assignment ? `${primary.slice(0, assignment.index)} ${extraCriteria}` : primary;
  const conditions: RouteCondition[] = [];
  const add = (field: RouteField, op: RouteOp, value: string, key?: string) => {
    const c: RouteCondition = { field, op, value: value.trim(), ...(key ? { key } : {}) };
    if (!conditions.some((x) => JSON.stringify(x) === JSON.stringify(c))) conditions.push(c);
  };
  const addSet = (field: RouteField, values: string[]) => { const v = unique(values); if (v.length) add(field, v.length > 1 ? "in" : "equals", v.join(",")); };
  const countries = COUNTRIES.filter(([aliases, code]) => has(criteria, aliases) || new RegExp(`\\bcountry\\s*(?:is|equals|:)?\\s*${code}\\b`, "i").test(criteria) || (code !== "IN" && new RegExp(`\\b${code}\\b`).test(criteria))).map(([, c]) => c);
  for (const m of criteria.matchAll(/\bcountry\s*(?:is|equals|:)?\s*([a-z]{2})\b/gi)) countries.push(m[1].toUpperCase());
  addSet("country", countries);
  addSet("region", REGIONS.filter(([aliases]) => has(criteria, aliases)).map(([, r]) => r));

  const numeric = (field: "employees" | "icpScore", label: string) => {
    for (const m of criteria.matchAll(new RegExp(`(?:${label})\\s*(?:score\\s*)?(?:is\\s+)?(${comparison})\\s*([\\d,]+)`, "gi"))) add(field, OPS[m[1].toLowerCase()], m[2].replaceAll(",", ""));
    if (field === "employees") {
      for (const m of criteria.matchAll(new RegExp(`(${comparison})\\s*([\\d,]+)\\s*(?:employees?|people|staff|headcount)\\b`, "gi"))) add(field, OPS[m[1].toLowerCase()], m[2].replaceAll(",", ""));
      for (const m of criteria.matchAll(/\b([\d,]+)\+\s*(?:employees?|people|staff)\b/gi)) add(field, "gte", m[1].replaceAll(",", ""));
      for (const m of criteria.matchAll(/\b(?:between\s+)?([\d,]+)\s*(?:-|–|to|and)\s*([\d,]+)\s*(?:employees?|people|staff)\b/gi)) { add(field, "gte", m[1].replaceAll(",", "")); add(field, "lte", m[2].replaceAll(",", "")); }
    }
  };
  numeric("employees", "employees?|headcount|company size");
  numeric("icpScore", "icp");
  if (!conditions.some((c) => c.field === "employees")) { const m = /\b([\d,]+)\s*(?:employees?|people|staff)\b/i.exec(criteria); if (m) add("employees", "equals", m[1].replaceAll(",", "")); }
  if (!conditions.some((c) => c.field === "icpScore")) { const m = /\bicp(?: score)?\s+([\d,]+)\b/i.exec(criteria); if (m) add("icpScore", "equals", m[1].replaceAll(",", "")); }
  if (/(?:over|above|under|below|>=|<=|icp|employees)\s*-\d/i.test(criteria)) blocked.push("Thresholds cannot be negative. Please give a positive employee count or an ICP score from 0 to 100.");
  const explicitDomain = /\bdomain\s*(equals|is|contains|ends with|:|=)?\s*(?:"([^"]+)"|(\*?\.?[\w-]+(?:\.[\w-]+)*))/i.exec(criteria);
  if (explicitDomain) { const value = explicitDomain[2] ?? explicitDomain[3]; add("domain", /ends with/i.test(explicitDomain[1] ?? "") || value.startsWith("*.") ? "ends_with" : explicitDomain[1] === "contains" ? "contains" : "equals", value.replace(/^\*\./, ".").toLowerCase()); }
  const domain = /(?:\*\.)?\b([a-z0-9-]+(?:\.[a-z0-9-]+)+)\b/i.exec(criteria);
  if (domain && !explicitDomain && (!/\banswers?\b/i.test(criteria) || /\bdomain\b/i.test(criteria))) add("domain", /ends?\s+with|\*\./i.test(criteria) ? "ends_with" : /domain\s+contains/i.test(criteria) ? "contains" : "equals", `${/\*\./.test(domain[0]) ? "." : ""}${domain[1].toLowerCase()}`);
  const industry = /\bindustry\s*(?:is\s+)?(equals|contains|in|:)?\s*(?:"([^"]+)"|([a-z][\w/-]*))/i.exec(criteria);
  if (industry) add("industry", industry[1] === "equals" ? "equals" : industry[1] === "in" ? "in" : "contains", industry[2] ?? industry[3]);
  else {
    const known = /\b(saas|software|fintech|healthcare|manufacturing|education|retail|finance|banking|logistics|insurance|AI\s*\/\s*ML)\b/i.exec(criteria);
    if (known) add("industry", "contains", known[1]);
  }
  const source = /\b(?:source\s*(?:is|equals|:)?\s*|from\s+(?:the\s+)?|via\s+)(form|chat|email|api)\b|\b(form|chat|email|api)\s+(?:leads?|submissions?)\b/i.exec(criteria);
  if (source) add("source", "equals", (source[1] ?? source[2]).toLowerCase());
  for (const m of criteria.matchAll(/\banswers?\s*[.:]?\s*(?:"([\w.-]+)"|([\w.-]+))\s*(ends with|contains|equals|in|>=|<=|>|<|=|is)\s*(?:"([^"]+)"|([\w.-]+))/gi)) add("answer", OPS[m[3].toLowerCase()], m[4] ?? m[5], m[1] ?? m[2]);

  if (conditions.some((c) => c.field === "icpScore")) blocked = blocked.filter((b) => !b.startsWith("What ICP score"));
  if (conditions.some((c) => c.field === "country" || c.field === "region")) blocked = blocked.filter((b) => !b.startsWith("I don't recognize the location"));
  const location = /\b(?:in|from)\s+(?:the\s+)?([a-z]+)\b/i.exec(criteria);
  if (location && !conditions.some((c) => c.field === "country" || c.field === "region") && !/^(form|chat|email|api|industry|domain)$/i.test(location[1])) blocked.push(`I don't recognize the location “${location[1]}”. Use a supported country name, explicit country code (country KR), or EMEA, NA, APAC or LATAM.`);
  const catchAll = !conditions.length && !has(criteria, "enterprise|mid[ -]?market|smb") && /\b(?:all leads|any lead|every lead|everyone else|all other leads|catch[ -]?all|anything|remaining leads)\b/i.test(criteria);
  const fieldKey = (c: RouteCondition) => `${c.field}:${c.key ?? ""}`;
  let merged = catchAll ? [] : [...(prior?.draft.conditions ?? []).filter((c) => !conditions.some((x) => fieldKey(x) === fieldKey(c))), ...conditions];
  if (/^(?:also|add|include)\b/i.test(text) && prior) for (const field of ["country", "region"] as const) {
    const old = prior.draft.conditions.find((c) => c.field === field), fresh = conditions.find((c) => c.field === field);
    if (old && fresh) { merged = merged.filter((c) => c.field !== field); merged.push({ field, op: "in", value: unique([...old.value.split(","), ...fresh.value.split(",")]).join(",") }); }
  }
  const needsSize = (has(criteria, "enterprise|mid[ -]?market|smb") || prior?.needsSize || false) && !merged.some((c) => c.field === "employees") && !catchAll;
  if (needsSize) questions.push("What employee threshold defines that segment? For example: at least 1000 employees. I won't guess what enterprise or SMB means.");
  if (!merged.length && !catchAll && !(prior?.draft.conditions.length === 0 && /all leads|catch.all/i.test(prior.draft.name))) questions.push("Which leads should this match? Add a country, region, size or another supported condition — or say all leads for a catch-all.");
  for (const field of ["employees", "icpScore"] as const) {
    const cs = merged.filter((c) => c.field === field);
    if (cs.some((c) => !Number.isFinite(Number(c.value)) || Number(c.value) < 0 || (field === "icpScore" && Number(c.value) > 100))) questions.push(`${field === "icpScore" ? "ICP score must be between 0 and 100" : "Employee count must be a positive number"}.`);
    const min = cs.find((c) => c.op === "gte"), max = cs.find((c) => c.op === "lte");
    if (min && max && Number(min.value) > Number(max.value)) questions.push("The minimum is larger than the maximum. Please correct the range.");
  }

  let remaining = normalize(target);
  const ids: string[] = [];
  for (const rep of reps) {
    const full = normalize(rep.name), re = new RegExp(`\\b${escapeRE(full)}\\b`, "g");
    if (re.test(remaining)) { ids.push(rep.id); remaining = remaining.replace(re, " "); }
  }
  const names = unique(reps.flatMap((r) => normalize(r.name).split(" ")).filter((n) => n.length > 2));
  for (const n of names) {
    const re = new RegExp(`\\b${escapeRE(n)}\\b`, "g");
    if (!re.test(remaining)) continue;
    const matches = reps.filter((r) => normalize(r.name).split(" ").includes(n));
    if (matches.length === 1) ids.push(matches[0].id);
    else questions.push(`Which ${n}? Use a full name: ${matches.map((r) => r.name).join(" or ")}.`);
    remaining = remaining.replace(re, " ");
  }
  const roundRobin = /round[ -]?robin|whole team|all (?:available )?reps|everyone|entire team/i.test(target);
  const poolRegion = REGIONS.find(([aliases]) => new RegExp(`\\b(?:${aliases})\\s+(?:reps|team|pool)\\b`, "i").test(target));
  const teamMatch = /\b(smb|midmarket|enterprise|emea)\s+(?:team|pool)\b/i.exec(target);
  // Unknown destinations must not silently turn into a whole-team pool.
  if (assignment) {
    const unknown = remaining.replace(/\b(?:and|or|round|robin|all|available|reps|rep|pool|team|the|whole|entire|everyone|only|please|emea|apac|na|latam|smb|midmarket|enterprise|north|america|asia|pacific|latin)\b/g, " ").replace(/[\d\s]+/g, " ").trim();
    if (unknown) questions.push(`I couldn't resolve “${unknown}” to a rep. Use a full name from your team.`);
  }
  let repIds = unique(ids);
  if (!repIds.length && !questions.some((q) => /Use a full name|resolve/.test(q))) {
    if (poolRegion) repIds = reps.filter((r) => r.region === poolRegion[1]).map((r) => r.id);
    else if (teamMatch) repIds = reps.filter((r) => r.team.toLowerCase() === teamMatch[1].toLowerCase()).map((r) => r.id);
    else if (roundRobin) repIds = reps.map((r) => r.id);
    else repIds = prior?.draft.repIds ?? [];
  }
  if (/^(?:also|add|include)\b/i.test(text) && prior && repIds.length) repIds = unique([...prior.draft.repIds, ...repIds]);
  if (!repIds.length && !questions.some((q) => /Use a full name|resolve/.test(q))) questions.push("Who should receive these leads? Name one or more reps, or say round robin across the whole team.");
  // An explicitly unresolved new destination must never retain a previously valid pool.
  if (questions.some((q) => /Use a full name|resolve/.test(q))) repIds = [];

  if (prior && !conditions.length && !ids.length && !catchAll && !roundRobin && !/match (?:all|any)|(?:all|any) conditions?|ignore|drop|remove/i.test(text) && !needsSize) questions.push("I couldn't translate that follow-up. Give a supported condition or a full rep name, or edit the draft manually.");
  const fieldCount = new Set(merged.map((c) => c.field)).size;
  const explicitAny = /match any|any condition|either condition/i.test(criteria);
  const or = /\bor\b/i.test(criteria);
  if (or && /\band\b/i.test(criteria) && fieldCount > 1 && !explicitAny) blocked.push("Mixed AND/OR groups need separate rules. Use all conditions or any condition explicitly so I don't change your intent.");
  if (/match (?:all|any)|(?:all|any) conditions?/i.test(criteria)) blocked = blocked.filter((b) => !b.startsWith("Mixed AND/OR"));
  const match = /match all|all conditions/i.test(criteria) ? "all" : explicitAny || (or && fieldCount > 1) ? "any" : prior?.draft.match ?? "all";
  const pool = repIds.map((id) => reps.find((r) => r.id === id)?.name).filter(Boolean).join(" + ");
  const name = `${merged.length ? merged.map(conditionDescription).join(match === "all" ? " · " : " or ") : "All leads (catch-all)"}${pool ? ` → ${pool}` : ""}`.slice(0, 160);
  if (fallback) notes.push("Other leads continue through remaining rules, then the existing whole-team round-robin fallback. No second rule is silently created.");
  notes.push("Account owners still take precedence. Away, paused and full reps are skipped; existing rep weights apply.");
  return { draft: { name, enabled: true, match, conditions: merged, repIds }, questions: unique([...questions, ...blocked]), notes, fallback, needsSize, blocked: unique(blocked) };
}
