import type { Metadata } from "next";
import { Legal } from "@/components/site/legal";
export const metadata: Metadata = { title: "Privacy policy" };
export default function Privacy() {
  return (
    <Legal title="Privacy policy" updated="5 November 2026">
      <p>This policy explains what personal data Velaroute (&ldquo;we&rdquo;) processes, why, and your rights. It is a template that will be reviewed by counsel before general availability.</p>
      <h2>Data we process</h2>
      <ul><li><strong>Account data</strong> — name, work email and password hash for workspace users.</li><li><strong>Lead data</strong> — information your website visitors submit through forms, chat or email, processed on behalf of our customers.</li><li><strong>Enrichment data</strong> — firmographic data returned by providers you enable (for example Apollo, Clay or Valyu).</li><li><strong>Usage data</strong> — logs needed to operate, secure and improve the service.</li></ul>
      <h2>Roles</h2>
      <p>For lead data we act as a processor for our customers, who are controllers. For account and usage data we are the controller.</p>
      <h2>Legal bases</h2>
      <p>Contract performance for account data; legitimate interests for security and service improvement; and our customers&apos; instructions for lead data.</p>
      <h2>Sub-processors</h2>
      <p>Hosting (Vercel) and any enrichment, AI or CRM provider that a customer chooses to connect with their own credentials.</p>
      <h2>Retention</h2>
      <p>Customer data is kept while the workspace is active and deleted within 30 days of closure, unless the customer exports or deletes it sooner.</p>
      <h2>Your rights</h2>
      <p>You may request access, correction, deletion, restriction or portability of your personal data, and you may complain to your data protection authority (in the UK, the ICO). If your data was submitted to one of our customers, please contact that customer first.</p>
      <h2>Contact</h2>
      <p>Use the <a href="/contact">contact form</a> and choose &ldquo;Privacy&rdquo;.</p>
    </Legal>
  );
}
