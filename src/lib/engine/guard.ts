import type { GuardResult, LeadInput, Settings } from "./types";
import { DISPOSABLE, FREE_MAIL, emailDomain, isEmail } from "./util";

const SPAM_WORDS = ["viagra", "casino", "airdrop", "seo services", "backlinks", "crypto giveaway", "loan offer", "escort", "betting"];

/** Score 0–100: higher = more likely bot/junk. Pure and explainable — every point has a reason. */
export function scoreGuard(input: LeadInput, settings: Settings): GuardResult {
  const reasons: string[] = [];
  let score = 0;
  const email = (input.email || "").trim();
  const domain = emailDomain(email);

  if (!isEmail(email)) { score += 100; reasons.push("Email address is not valid"); }
  if (input.honeypot && input.honeypot.trim()) { score += 100; reasons.push("Hidden honeypot field was filled (bot)"); }
  if (typeof input.elapsedMs === "number" && input.elapsedMs > 0 && input.elapsedMs < 2500) {
    score += 40; reasons.push(`Form completed in ${(input.elapsedMs / 1000).toFixed(1)}s (too fast for a human)`);
  }
  if (DISPOSABLE.has(domain)) {
    score += settings.blockDisposable ? 100 : 60;
    reasons.push(`Disposable email domain (${domain})`);
  }
  if (FREE_MAIL.has(domain)) { score += 15; reasons.push("Personal email domain (not a company address)"); }

  const name = (input.name || "").trim();
  if (name && (!/[aeiouy]/i.test(name) || /(.)\1{3,}/.test(name) || name.length > 60)) {
    score += 25; reasons.push("Name looks auto-generated");
  }
  const text = `${input.message || ""} ${Object.values(input.answers || {}).join(" ")}`.toLowerCase();
  const links = (text.match(/https?:\/\//g) || []).length;
  if (links > 2) { score += 30; reasons.push(`${links} links in the message`); }
  const hit = SPAM_WORDS.find((w) => text.includes(w));
  if (hit) { score += 50; reasons.push(`Spam phrase detected ("${hit}")`); }

  score = Math.min(100, score);
  const verdict = score >= settings.botBlockScore ? "block" : score >= settings.botReviewScore ? "review" : "pass";
  if (!reasons.length) reasons.push("No risk signals");
  return { score, verdict, reasons };
}
