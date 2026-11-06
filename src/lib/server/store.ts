import "server-only";
import path from "node:path";
import fs from "node:fs";
import { createRequire } from "node:module";
import type { Workspace } from "../engine/types";
import { demoWorkspace, emptyWorkspace } from "../engine/seed";
import { storageMode } from "./env";

type DB = import("better-sqlite3").Database;
const g = globalThis as unknown as { __vrDb?: DB; __vrMem?: Map<string, Workspace>; __vrHealth?: HealthSample[]; __vrUsers?: Map<string, UserRow> };

export interface UserRow { id: string; email: string; name: string; pass_hash: string; wid: string; role: "owner" | "admin" | "member"; created_at: string }
export interface HealthSample { at: string; component: string; ok: boolean; ms: number; detail: string }

export function db(): DB {
  if (g.__vrDb) return g.__vrDb;
  const dir = process.env.DATA_DIR || path.join(process.cwd(), "data");
  fs.mkdirSync(dir, { recursive: true });
  const req = createRequire(import.meta.url);
  const Database = req("better-sqlite3") as typeof import("better-sqlite3");
  const d = new Database(path.join(dir, "velaroute.db"));
  d.pragma("journal_mode = WAL");
  d.exec(`
    CREATE TABLE IF NOT EXISTS workspaces (id TEXT PRIMARY KEY, json TEXT NOT NULL, updated_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, name TEXT NOT NULL, pass_hash TEXT NOT NULL, wid TEXT NOT NULL, role TEXT NOT NULL, created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS health (at TEXT NOT NULL, component TEXT NOT NULL, ok INTEGER NOT NULL, ms INTEGER NOT NULL, detail TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS health_at ON health(at);
  `);
  g.__vrDb = d;
  return d;
}

function mem(): Map<string, Workspace> {
  return (g.__vrMem ??= new Map());
}

export function seedFor(wid: string): Workspace {
  return wid === "ws_demo" ? demoWorkspace("ws_demo") : emptyWorkspace(wid, "My workspace");
}

/** Load a workspace. In browser mode a client snapshot (localStorage) wins over this instance's memory. */
export function loadWorkspace(wid: string, snapshot?: unknown): Workspace {
  if (storageMode() === "sqlite") {
    const row = db().prepare("SELECT json FROM workspaces WHERE id = ?").get(wid) as { json: string } | undefined;
    if (row) return JSON.parse(row.json) as Workspace;
    const ws = seedFor(wid);
    saveWorkspace(ws);
    return ws;
  }
  if (isWorkspace(snapshot, wid)) {
    mem().set(wid, snapshot);
    return structuredClone(snapshot);
  }
  const m = mem().get(wid);
  if (m) return structuredClone(m);
  const ws = seedFor(wid);
  mem().set(wid, ws);
  return structuredClone(ws);
}

export function saveWorkspace(ws: Workspace): void {
  ws.version = (ws.version ?? 0) + 1;
  if (storageMode() === "sqlite") {
    db().prepare("INSERT INTO workspaces (id, json, updated_at) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET json = excluded.json, updated_at = excluded.updated_at").run(ws.id, JSON.stringify(ws), new Date().toISOString());
  } else {
    mem().set(ws.id, structuredClone(ws));
  }
}

export function resetWorkspace(wid: string): Workspace {
  const ws = seedFor(wid);
  if (storageMode() === "sqlite") db().prepare("DELETE FROM workspaces WHERE id = ?").run(wid);
  mem().delete(wid);
  saveWorkspace(ws);
  return ws;
}

export function allWorkspaceIds(): string[] {
  if (storageMode() === "sqlite") return (db().prepare("SELECT id FROM workspaces").all() as { id: string }[]).map((r) => r.id);
  return [...mem().keys()];
}

function isWorkspace(x: unknown, wid: string): x is Workspace {
  return !!x && typeof x === "object" && (x as Workspace).id === wid && Array.isArray((x as Workspace).leads) && Array.isArray((x as Workspace).reps);
}

export function recordHealth(samples: HealthSample[]): void {
  if (storageMode() === "sqlite") {
    const ins = db().prepare("INSERT INTO health (at, component, ok, ms, detail) VALUES (?, ?, ?, ?, ?)");
    const tx = db().transaction((rows: HealthSample[]) => { for (const s of rows) ins.run(s.at, s.component, s.ok ? 1 : 0, s.ms, s.detail); });
    tx(samples);
    db().prepare("DELETE FROM health WHERE at < ?").run(new Date(Date.now() - 7 * 86400000).toISOString());
  } else {
    const arr = (g.__vrHealth ??= []);
    arr.push(...samples);
    if (arr.length > 5000) arr.splice(0, arr.length - 5000);
  }
}

export function healthHistory(sinceMs = 24 * 3600000): HealthSample[] {
  const since = new Date(Date.now() - sinceMs).toISOString();
  if (storageMode() === "sqlite") return (db().prepare("SELECT at, component, ok, ms, detail FROM health WHERE at >= ? ORDER BY at").all(since) as (Omit<HealthSample, "ok"> & { ok: number })[]).map((r) => ({ ...r, ok: !!r.ok }));
  return (g.__vrHealth ?? []).filter((s) => s.at >= since);
}

export function memUsers(): Map<string, UserRow> {
  return (g.__vrUsers ??= new Map());
}
