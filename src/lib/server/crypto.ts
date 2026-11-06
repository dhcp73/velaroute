import "server-only";
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { SESSION_SECRET } from "./env";

const KEY = createHash("sha256").update(`enc:${SESSION_SECRET}`).digest();

export function sha256(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}
export function hmac(secret: string, body: string): string {
  return createHmac("sha256", secret).update(body).digest("hex");
}
export function sign(payload: object): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", SESSION_SECRET).update(body).digest("base64url");
  return `${body}.${sig}`;
}
export function verify<T>(token: string | undefined): T | null {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expect = createHmac("sha256", SESSION_SECRET).update(body).digest("base64url");
  const a = Buffer.from(sig), b = Buffer.from(expect);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const p = JSON.parse(Buffer.from(body, "base64url").toString()) as T & { exp?: number };
    if (p.exp && p.exp < Date.now()) return null;
    return p;
  } catch { return null; }
}
export function hashPassword(pw: string): string {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(pw, salt, 32).toString("hex")}`;
}
export function checkPassword(pw: string, stored: string): boolean {
  const [salt, h] = stored.split(":");
  if (!salt || !h) return false;
  const a = scryptSync(pw, salt, 32), b = Buffer.from(h, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}
export function encrypt(plain: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", KEY, iv);
  const enc = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return `enc:${Buffer.concat([iv, c.getAuthTag(), enc]).toString("base64url")}`;
}
export function decrypt(s: string | undefined): string | undefined {
  if (!s) return undefined;
  if (!s.startsWith("enc:")) return s;
  try {
    const buf = Buffer.from(s.slice(4), "base64url");
    const d = createDecipheriv("aes-256-gcm", KEY, buf.subarray(0, 12));
    d.setAuthTag(buf.subarray(12, 28));
    return Buffer.concat([d.update(buf.subarray(28)), d.final()]).toString("utf8");
  } catch { return undefined; }
}
export function randomToken(n = 18): string {
  return randomBytes(n).toString("base64url");
}
