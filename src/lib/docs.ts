import "server-only";
import fs from "node:fs";
import path from "node:path";
import { marked } from "marked";

export const DOC_ORDER = ["getting-started", "routing", "enrichment", "sla", "integrations", "rest-api", "webhooks", "mcp", "pricing"] as const;
export type Doc = { slug: string; title: string; description: string; html: string; headings: { id: string; text: string }[] };

const dir = path.join(process.cwd(), "src/content/docs");
const slugify = (t: string) => t.toLowerCase().replace(/<[^>]+>/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export function getDoc(slug: string): Doc | null {
  if (!(DOC_ORDER as readonly string[]).includes(slug)) return null;
  const raw = fs.readFileSync(path.join(dir, `${slug}.md`), "utf8");
  const m = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  const meta: Record<string, string> = {};
  for (const line of (m?.[1] ?? "").split("\n")) { const i = line.indexOf(":"); if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim(); }
  const body = m?.[2] ?? raw;
  const headings: Doc["headings"] = [];
  const renderer = new marked.Renderer();
  renderer.heading = ({ tokens, depth }) => {
    const text = renderer.parser.parseInline(tokens);
    const id = slugify(text);
    if (depth === 2) headings.push({ id, text: text.replace(/<[^>]+>/g, "") });
    return `<h${depth} id="${id}"><a href="#${id}" class="no-underline">${text}</a></h${depth}>`;
  };
  renderer.image = ({ href, text }) => `<figure><img src="${href}" alt="${text}" loading="lazy" width="1280" height="800" /><figcaption>${text}</figcaption></figure>`;
  const html = marked.parse(body, { async: false, renderer });
  return { slug, title: meta.title ?? slug, description: meta.description ?? "", html, headings };
}

export function allDocs() { return DOC_ORDER.map((s) => getDoc(s)!); }
