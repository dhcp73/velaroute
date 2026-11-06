"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button, Field, Input } from "@/components/ui";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const [v, setV] = useState({ name: "", company: "", email: "", password: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr("");
    try {
      const r = await fetch(`/api/auth/${mode}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(v) });
      const j = await r.json();
      if (!r.ok) { setErr(j.error?.detail ?? "Something went wrong"); return; }
      const next = new URLSearchParams(location.search).get("next");
      window.location.href = next && next.startsWith("/app") ? next : "/app";
    } catch { setErr("Network error — try again"); } finally { setBusy(false); }
  };
  const demo = (email: string, password: string) => setV((cur) => ({ ...cur, email, password }));
  useEffect(() => { if (mode === "login" && new URLSearchParams(location.search).get("demo")) demo("demo@velaroute.dev", "demo1234"); }, [mode]);
  return (
    <div className="w-full">
      <h1 className="font-display text-3xl font-semibold tracking-tight">{mode === "login" ? "Welcome back" : "Start routing in minutes"}</h1>
      <p className="mt-2 text-sm text-muted">{mode === "login" ? "Log in to your Velaroute workspace." : "Free 14-day trial. No card needed."}</p>
      <form onSubmit={submit} className="card mt-6 grid gap-4 p-6" noValidate>
        {mode === "signup" && <>
          <Field label="Your name" htmlFor="name"><Input id="name" autoComplete="name" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} required /></Field>
          <Field label="Company" htmlFor="company"><Input id="company" autoComplete="organization" value={v.company} onChange={(e) => setV({ ...v, company: e.target.value })} /></Field>
        </>}
        <Field label="Work email" htmlFor="email"><Input id="email" type="email" autoComplete="email" value={v.email} onChange={(e) => setV({ ...v, email: e.target.value })} required /></Field>
        <Field label="Password" htmlFor="password" hint={mode === "signup" ? "At least 8 characters" : undefined}><Input id="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} value={v.password} onChange={(e) => setV({ ...v, password: e.target.value })} required /></Field>
        {err && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-300" role="alert">{err}</p>}
        <Button type="submit" size="lg" loading={busy}>{mode === "login" ? "Log in" : "Create workspace"}</Button>
      </form>
      {mode === "login" && (
        <div className="mt-4 rounded-2xl border border-dashed border-line p-4 text-sm">
          <p className="font-medium">Try the demo workspace</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button size="sm" variant="tonal" onClick={() => demo("demo@velaroute.dev", "demo1234")}>Fill demo login</Button>
            <Button size="sm" variant="secondary" onClick={() => demo("admin@velaroute.dev", "admin1234")}>Fill admin login</Button>
          </div>
          <p className="mt-2 text-xs text-muted">demo@velaroute.dev / demo1234</p>
        </div>
      )}
      <p className="mt-6 text-center text-sm text-muted">{mode === "login" ? <>New to Velaroute? <Link href="/signup" className="font-medium text-primary-600 hover:underline dark:text-primary-300">Create an account</Link></> : <>Already have an account? <Link href="/login" className="font-medium text-primary-600 hover:underline dark:text-primary-300">Log in</Link></>}</p>
    </div>
  );
}
