import { PageHero, Section } from "./page-hero";

export function Legal({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <>
      <PageHero eyebrow="Legal" title={title}><p className="text-sm">Last updated {updated}</p></PageHero>
      <Section className="!pt-0"><article className="prose mx-auto max-w-3xl dark:prose-invert">{children}</article></Section>
    </>
  );
}
