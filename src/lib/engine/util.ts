export function uid(prefix: string): string {
  const c = globalThis.crypto;
  const raw = c?.randomUUID ? c.randomUUID().replace(/-/g, "") : Math.random().toString(16).slice(2) + Date.now().toString(16);
  return `${prefix}_${raw.slice(0, 14)}`;
}

/** FNV-1a 32-bit — deterministic hash for offline data. */
export function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function pick<T>(arr: readonly T[], seed: number): T {
  return arr[seed % arr.length];
}

export const FREE_MAIL = new Set([
  "gmail.com", "googlemail.com", "yahoo.com", "outlook.com", "hotmail.com", "live.com", "icloud.com", "me.com",
  "aol.com", "proton.me", "protonmail.com", "gmx.com", "yandex.com", "zoho.com", "mail.com",
]);

export const DISPOSABLE = new Set([
  "mailinator.com", "guerrillamail.com", "10minutemail.com", "tempmail.com", "temp-mail.org", "trashmail.com",
  "yopmail.com", "getnada.com", "sharklasers.com", "dispostable.com", "throwawaymail.com", "maildrop.cc",
  "fakeinbox.com", "mintemail.com", "emailondeck.com", "spamgourmet.com", "mohmal.com", "tempail.com",
]);

export function emailDomain(email: string): string {
  const at = email.lastIndexOf("@");
  return at === -1 ? "" : email.slice(at + 1).trim().toLowerCase();
}

export function isEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(s.trim());
}

export function titleCase(s: string): string {
  return s.replace(/[-_.]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function minutesBetween(a: string, b: string): number {
  return (new Date(b).getTime() - new Date(a).getTime()) / 60000;
}

export function median(nums: number[]): number {
  if (!nums.length) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export const TZ_OFFSETS: Record<string, number> = {
  "America/Los_Angeles": -8,
  "America/Denver": -7,
  "America/Chicago": -6,
  "America/New_York": -5,
  "Europe/London": 0,
  "Europe/Berlin": 1,
  "Asia/Kolkata": 5.5,
  "Asia/Singapore": 8,
  "Australia/Sydney": 11,
};

export const COUNTRY_REGION: Record<string, string> = {
  US: "NA", CA: "NA", MX: "NA", BR: "LATAM", AR: "LATAM",
  GB: "EMEA", IE: "EMEA", DE: "EMEA", FR: "EMEA", NL: "EMEA", ES: "EMEA", SE: "EMEA", DK: "EMEA", IL: "EMEA", AE: "EMEA",
  IN: "APAC", SG: "APAC", AU: "APAC", JP: "APAC", NZ: "APAC",
};
