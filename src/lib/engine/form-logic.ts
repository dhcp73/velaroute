import type { Form, LogicRule } from "./types";

export function ruleHolds(rule: LogicRule, answers: Record<string, string>): boolean {
  const raw = (answers[rule.fieldId] ?? "").toString();
  const v = raw.toLowerCase().trim();
  const t = rule.value.toLowerCase().trim();
  switch (rule.op) {
    case "equals": return v === t;
    case "not_equals": return v !== t;
    case "contains": return v.includes(t);
    case "gte": return raw !== "" && Number(raw) >= Number(rule.value);
    case "lte": return raw !== "" && Number(raw) <= Number(rule.value);
    case "filled": return v.length > 0;
    case "empty": return v.length === 0;
  }
}

/** Branching: the first rule on the current step that holds decides the next step; otherwise go to the next step in order. */
export function nextStep(form: Form, currentStepId: string, answers: Record<string, string>): string {
  for (const r of form.logic.filter((l) => l.stepId === currentStepId)) {
    if (ruleHolds(r, answers)) return r.goto;
  }
  const i = form.steps.findIndex((s) => s.id === currentStepId);
  return i >= 0 && i < form.steps.length - 1 ? form.steps[i + 1].id : "submit";
}

/** The path a respondent would take for a given set of answers (used by the preview + validation). */
export function pathFor(form: Form, answers: Record<string, string>): string[] {
  const path: string[] = [];
  let cur = form.steps[0]?.id;
  const seen = new Set<string>();
  while (cur && cur !== "submit" && !seen.has(cur)) {
    seen.add(cur);
    path.push(cur);
    cur = nextStep(form, cur, answers);
  }
  return path;
}

export function validateStep(form: Form, stepId: string, answers: Record<string, string>): Record<string, string> {
  const step = form.steps.find((s) => s.id === stepId);
  const errors: Record<string, string> = {};
  for (const f of step?.fields ?? []) {
    const v = (answers[f.id] ?? "").trim();
    if (f.required && !v) errors[f.id] = `${f.label} is required`;
    else if (v && f.type === "email" && !/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(v)) errors[f.id] = "Enter a valid email";
    else if (v && f.type === "number" && Number.isNaN(Number(v))) errors[f.id] = "Enter a number";
  }
  return errors;
}
