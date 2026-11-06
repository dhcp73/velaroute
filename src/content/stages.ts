import { Building2, CalendarCheck, Database, FileInput, Radar, ShieldCheck, Split, Timer } from "lucide-react";

export const STAGES = [
  { id: "capture", icon: FileInput, name: "Capture", text: "Branching forms, chat, email-to-lead and the API all land in one queue.", out: "Maya Brooks · Head of Revenue · kestrel.ai" },
  { id: "guard", icon: ShieldCheck, name: "Guard", text: "Honeypot, timing, disposable domains and spam phrases scored before anything is spent.", out: "Risk 0/100 · pass" },
  { id: "enrich", icon: Database, name: "Enrich", text: "Apollo → Clay → Valyu waterfall with a per-lead and monthly spend cap. Cache by domain.", out: "75 employees · DE · AI / ML · $0.05" },
  { id: "match", icon: Building2, name: "Match", text: "Lead-to-account match by domain and duplicate merge, so owners keep their accounts.", out: "No account · no duplicate" },
  { id: "route", icon: Split, name: "Route", text: "Rules on geo, size, industry and ICP score, then weighted round robin that skips away reps.", out: "Rule “EMEA territory” → Jonas Weber" },
  { id: "book", icon: CalendarCheck, name: "Book", text: "The right rep's real free slots appear the second the form is sent.", out: "Thu 14:30 · Microsoft Teams" },
  { id: "sync", icon: Radar, name: "Sync", text: "Contact, company, owner and meeting written back to HubSpot, Salesforce or Attio.", out: "upsert contact → HubSpot" },
  { id: "sla", icon: Timer, name: "SLA", text: "A 5-minute first-touch clock with Slack alerts and automatic re-routing on breach.", out: "First touch due in 4:59" },
];
