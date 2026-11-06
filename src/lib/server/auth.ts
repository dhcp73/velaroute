import "server-only";
import { cookies } from "next/headers";
import type { UserRow } from "./store";
import { db, memUsers } from "./store";
import { storageMode } from "./env";
import { checkPassword, hashPassword, sign, verify } from "./crypto";
import { uid } from "../engine/util";

export interface Session { uid: string; email: string; name: string; role: UserRow["role"]; wid: string; exp: number }
export const SESSION_COOKIE = "vr_session";
const ACCOUNT_COOKIE = "vr_acct";
const DAY = 86400000;

/** Demo accounts exist in every mode. Password hashes are computed lazily. */
const DEMO_USERS: Omit<UserRow, "pass_hash">[] = [
  { id: "usr_demo", email: "demo@velaroute.dev", name: "Rahul Patel", wid: "ws_demo", role: "owner", created_at: "2026-10-01T09:00:00.000Z" },
  { id: "usr_admin", email: "admin@velaroute.dev", name: "Admin", wid: "ws_demo", role: "admin", created_at: "2026-10-01T09:00:00.000Z" },
];
const DEMO_PASSWORDS: Record<string, string> = { "demo@velaroute.dev": "demo1234", "admin@velaroute.dev": "admin1234" };

function ensureDemoUsers(): void {
  if (storageMode() === "sqlite") {
    const d = db();
    for (const u of DEMO_USERS) {
      const exists = d.prepare("SELECT 1 FROM users WHERE email = ?").get(u.email);
      if (!exists) d.prepare("INSERT INTO users (id, email, name, pass_hash, wid, role, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)").run(u.id, u.email, u.name, hashPassword(DEMO_PASSWORDS[u.email]), u.wid, u.role, u.created_at);
    }
  }
}

export async function findUser(email: string): Promise<UserRow | undefined> {
  const e = email.trim().toLowerCase();
  if (storageMode() === "sqlite") {
    ensureDemoUsers();
    return db().prepare("SELECT * FROM users WHERE email = ?").get(e) as UserRow | undefined;
  }
  const demo = DEMO_USERS.find((u) => u.email === e);
  if (demo) return { ...demo, pass_hash: "demo" };
  const m = memUsers().get(e);
  if (m) return m;
  const jar = await cookies();
  const acct = verify<UserRow>(jar.get(ACCOUNT_COOKIE)?.value);
  return acct && acct.email === e ? acct : undefined;
}

export async function authenticate(email: string, password: string): Promise<UserRow | null> {
  const u = await findUser(email);
  if (!u) return null;
  if (u.pass_hash === "demo") return DEMO_PASSWORDS[u.email] === password ? u : null;
  return checkPassword(password, u.pass_hash) ? u : null;
}

export async function createUser(name: string, email: string, password: string, company: string): Promise<UserRow> {
  const e = email.trim().toLowerCase();
  if (await findUser(e)) throw new Error("An account with this email already exists — log in instead");
  const row: UserRow = { id: uid("usr"), email: e, name: name.trim() || e.split("@")[0], pass_hash: hashPassword(password), wid: uid("ws"), role: "owner", created_at: new Date().toISOString() };
  if (storageMode() === "sqlite") {
    db().prepare("INSERT INTO users (id, email, name, pass_hash, wid, role, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)").run(row.id, row.email, row.name, row.pass_hash, row.wid, row.role, row.created_at);
  } else {
    memUsers().set(e, row);
    const jar = await cookies();
    jar.set(ACCOUNT_COOKIE, sign({ ...row, exp: Date.now() + 365 * DAY }), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 365 * 86400 });
  }
  void company;
  return row;
}

export async function startSession(u: UserRow): Promise<void> {
  const jar = await cookies();
  const s: Session = { uid: u.id, email: u.email, name: u.name, role: u.role, wid: u.wid, exp: Date.now() + 14 * DAY };
  jar.set(SESSION_COOKIE, sign(s), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 14 * 86400 });
}

export async function endSession(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}

export async function getSession(): Promise<Session | null> {
  return verify<Session>((await cookies()).get(SESSION_COOKIE)?.value);
}
