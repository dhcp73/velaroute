import { allDocs } from "@/lib/docs";
import { DocsNav } from "./nav";

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  const items = allDocs().map((d) => ({ slug: d.slug, title: d.title }));
  return (
    <div className="mx-auto grid max-w-7xl gap-8 px-5 py-10 sm:px-8 lg:grid-cols-[220px_minmax(0,1fr)] lg:py-14">
      <aside><DocsNav items={items} /></aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
