import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loadWorkspace } from "@/lib/server/store";
import { PublicForm } from "./public-form";

export const dynamic = "force-dynamic";
type P = { params: Promise<{ wid: string; slug: string }>; searchParams: Promise<{ embed?: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { wid, slug } = await params;
  const f = loadWorkspace(wid).forms.find((x) => x.slug === slug);
  return { title: f?.name ?? "Form", robots: { index: false } };
}

export default async function HostedFormPage({ params, searchParams }: P) {
  const { wid, slug } = await params;
  const { embed } = await searchParams;
  if (!/^ws_[a-z0-9_]+$/i.test(wid)) notFound();
  const ws = loadWorkspace(wid);
  const form = ws.forms.find((f) => f.slug === slug);
  return <PublicForm wid={wid} slug={slug} initial={form ?? null} workspace={ws.name} embed={embed === "1"} />;
}
