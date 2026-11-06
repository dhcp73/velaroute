import type { Metadata } from "next";
import { PageHero, Section } from "@/components/site/page-hero";
import { StatusBoard } from "./status-board";

export const metadata: Metadata = { title: "Status", description: "Live health of the Velaroute pipeline, API and MCP server." };

export default function StatusPage() {
  return (
    <>
      <PageHero eyebrow="Status" title="System status">Live checks against the storage layer, the inbound pipeline, the router, the SLA agent, the REST API and the MCP server.</PageHero>
      <Section className="!pt-0"><div className="mx-auto max-w-3xl"><StatusBoard /></div></Section>
    </>
  );
}
