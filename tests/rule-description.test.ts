import { describe, expect, it } from "vitest";
import { parseRuleDescription as parse, conditionDescription } from "@/lib/engine/rule-description";
import type { Rep } from "@/lib/engine/types";
const reps: Pick<Rep, "id" | "name" | "region" | "team">[] = [
  { id: "jonas", name: "Jonas Weber", region: "EMEA" as const, team: "emea" },
  { id: "sofia", name: "Sofia Alvarez", region: "EMEA" as const, team: "emea" },
  { id: "ava", name: "Ava Chen", region: "NA" as const, team: "smb" },
];
const condition = (field: string, op: string, value: string) => ({ field, op, value });
describe("key-free routing descriptions", () => {
  it("compiles countries and actual reps without creating a fallback rule", () => {
    const r = parse("Germany leads go to Jonas, everyone else round-robin", reps);
    expect(r.questions).toEqual([]);
    expect(r.draft.conditions).toEqual([condition("country", "equals", "DE")]);
    expect(r.draft.repIds).toEqual(["jonas"]);
    expect(r.fallback).toBe(true);
  });
  it("compiles region, size and named round-robin pool", () => {
    const r = parse("EMEA companies over 50 employees between Jonas and Sofia", reps);
    expect(r.questions).toEqual([]);
    expect(r.draft.conditions).toContainEqual(condition("region", "equals", "EMEA"));
    expect(r.draft.conditions).toContainEqual(condition("employees", "gte", "50"));
    expect(r.draft.repIds).toEqual(["jonas", "sofia"]);
  });
  it.each(["Germany", "German", "country DE", "DE"])("normalizes country %s", (country) => {
    expect(parse(`${country} leads go to Jonas`, reps).draft.conditions).toContainEqual(condition("country", "equals", "DE"));
  });
  it("supports country codes beyond the name dictionary", () => expect(parse("country KR leads go to Jonas", reps).draft.conditions).toContainEqual(condition("country", "equals", "KR")));
  it("does not interpret lowercase in as India", () => expect(parse("leads in Germany go to Jonas", reps).draft.conditions).toEqual([condition("country", "equals", "DE")]));
  it("asks what enterprise means and merges a numeric follow-up", () => {
    const r = parse("enterprise leads in Germany go to Jonas, everyone else round-robin", reps);
    expect(r.questions.join()).toContain("employee threshold");
    const next = parse("at least 1000 employees", reps, r);
    expect(next.questions).toEqual([]);
    expect(next.draft.repIds).toEqual(["jonas"]);
    expect(next.draft.conditions).toContainEqual(condition("country", "equals", "DE"));
    expect(next.draft.conditions).toContainEqual(condition("employees", "gte", "1000"));
  });
  it("retains a named rep while clarifying missing criteria", () => {
    const r = parse("go to Jonas", reps);
    expect(r.questions.join()).toContain("Which leads");
    const next = parse("Germany", reps, r);
    expect(next.questions).toEqual([]); expect(next.draft.repIds).toEqual(["jonas"]);
  });
  it("clarifies ambiguous reps then resolves a full-name followup", () => {
    const team = [...reps, { ...reps[0], id: "jonas2", name: "Jonas Smith" }];
    const r = parse("Germany leads go to Jonas", team);
    expect(r.questions.join()).toContain("Which jonas"); expect(r.draft.repIds).toEqual([]);
    const next = parse("Jonas Weber", team, r);
    expect(next.questions).toEqual([]); expect(next.draft.repIds).toEqual(["jonas"]);
  });
  it("never silently keeps an old pool for an unknown new destination", () => {
    const r = parse("Germany leads go to Jonas", reps);
    const next = parse("instead use George", reps, r);
    expect(next.questions.join()).toContain("resolve"); expect(next.draft.repIds).toEqual([]);
  });
  it("supports whole-team and regional pools", () => {
    expect(parse("all leads round robin", reps).draft.repIds).toEqual(["jonas", "sofia", "ava"]);
    expect(parse("country DE leads go to EMEA team", reps).draft.repIds).toEqual(["jonas", "sofia"]);
  });
  it("supports explicit catch-all and asks for missing destinations", () => {
    expect(parse("everyone else round robin", reps).questions).toEqual([]);
    expect(parse("everyone else round robin", reps).draft.conditions).toEqual([]);
    expect(parse("Germany leads", reps).questions.join()).toContain("Who should receive");
    expect(parse("all leads go to Ava", reps).draft.repIds).toEqual(["ava"]);
  });
  it("parses domain, industry, ICP, source and form answers", () => {
    const r = parse('domain ends with *.acme.com and industry contains "Software" and ICP at least 80 and source form and answer budget >= 5000 go to Ava', reps);
    expect(r.questions).toEqual([]);
    expect(r.draft.conditions).toEqual(expect.arrayContaining([
      condition("domain", "ends_with", ".acme.com"), condition("industry", "contains", "Software"), condition("icpScore", "gte", "80"), condition("source", "equals", "form"), { ...condition("answer", "gte", "5000"), key: "budget" },
    ]));
    expect(conditionDescription(r.draft.conditions.find((c) => c.field === "answer")!)).toContain("budget");
  });
  it("does not turn a domain-valued form answer into a lead-domain condition", () => {
    const r = parse('answer website equals "acme.com" go to Jonas', reps);
    expect(r.draft.conditions).toEqual([{ field: "answer", op: "equals", key: "website", value: "acme.com" }]);
  });
  it("supports size ranges and rejects impossible ranges and ICP", () => {
    const r = parse("companies with between 50 and 200 employees go to Ava", reps);
    expect(r.draft.conditions).toEqual([condition("employees", "gte", "50"), condition("employees", "lte", "200")]);
    expect(parse("between 200 and 50 employees go to Ava", reps).questions.join()).toContain("minimum");
    expect(parse("ICP over 101 go to Ava", reps).questions.join()).toContain("0 and 100");
  });
  it("replaces a field on followup and can add countries or reps", () => {
    const r = parse("Germany leads over 50 employees go to Jonas", reps);
    const next = parse("under 200 employees", reps, r);
    expect(next.draft.conditions.filter((c) => c.field === "employees")).toEqual([condition("employees", "lte", "200")]);
    const extra = parse("also France", reps, next);
    expect(extra.draft.conditions).toContainEqual(condition("country", "in", "DE,FR"));
    expect(parse("add Sofia", reps, extra).draft.repIds).toEqual(["jonas", "sofia"]);
  });
  it("supports simple any/all and rejects ambiguous boolean groups", () => {
    expect(parse("Germany or ICP over 80 go to Jonas", reps).draft.match).toBe("any");
    expect(parse("Germany or France and ICP over 80 go to Jonas", reps).questions.join()).toContain("Mixed AND/OR");
    expect(parse("Germany and software or ICP over 80 go to Jonas", reps).questions.join()).toContain("Mixed AND/OR");
  });
  it("keeps unsupported criteria blocked until explicitly removed", () => {
    const r = parse("Germany leads with revenue over 5000 go to Jonas", reps);
    expect(r.questions.join()).toContain("not available");
    expect(parse("Jonas Weber", reps, r).questions.join()).toContain("not available");
    expect(parse("remove the revenue filter", reps, r).questions).toEqual([]);
  });
  it("clarifies intent and unknown locations rather than guessing", () => {
    const r = parse("hot leads go to Jonas", reps);
    expect(r.questions.join()).toContain("ICP score");
    expect(parse("ICP at least 80", reps, r).questions).toEqual([]);
    expect(parse("software leads in Atlantis go to Jonas", reps).questions.join()).toContain("location");
  });
  it("never creates an invented rep or a second named fallback", () => {
    expect(parse("Germany go to George", reps).questions.join()).toContain("resolve");
    expect(parse("Germany go to Jonas, otherwise Ava", reps).questions.length).toBeGreaterThan(0);
  });
  it("does not erase criteria after the phrase all leads", () => {
    const r = parse("all leads in Germany go to Jonas", reps);
    expect(r.questions).toEqual([]);
    expect(r.draft.conditions).toEqual([condition("country", "equals", "DE")]);
    expect(parse("all leads enterprise go to Jonas", reps).questions.join()).toContain("employee threshold");
  });
  it("supports OR across multiple countries and another field", () => {
    expect(parse("Germany or France or ICP over 80 go to Jonas", reps).draft.match).toBe("any");
  });
  it("supports literal domain substrings and suffixes", () => {
    expect(parse("domain contains acme go to Jonas", reps).draft.conditions).toContainEqual(condition("domain", "contains", "acme"));
    expect(parse("domain ends with .com go to Jonas", reps).draft.conditions).toContainEqual(condition("domain", "ends_with", ".com"));
  });
  it("does not silently accept an untranslated follow-up", () => {
    const r = parse("Germany leads go to Jonas", reps);
    expect(parse("George", reps, r).questions.join()).toContain("follow-up");
  });
  it("can reset an ongoing conversation", () => {
    const r = parse("Germany leads go to Jonas", reps);
    const next = parse("new rule: all leads go to Ava", reps, r);
    expect(next.draft.conditions).toEqual([]); expect(next.draft.repIds).toEqual(["ava"]);
  });
});
