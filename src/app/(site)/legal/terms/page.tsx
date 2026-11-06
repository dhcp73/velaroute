import type { Metadata } from "next";
import { Legal } from "@/components/site/legal";
export const metadata: Metadata = { title: "Terms of service" };
export default function Terms() {
  return (
    <Legal title="Terms of service" updated="5 November 2026">
      <p>These terms govern your use of Velaroute. They are a working draft pending legal review; by using the service during the trial you agree to them.</p>
      <h2>1. The service</h2><p>Velaroute provides software for capturing, qualifying, routing and scheduling inbound sales leads. Features may change; we will give notice of material changes.</p>
      <h2>2. Accounts</h2><p>You are responsible for your users, credentials and API keys, and for activity in your workspace.</p>
      <h2>3. Your data</h2><p>You own your data. You grant us the rights needed to operate the service for you. You are responsible for having a lawful basis to collect lead data through Velaroute.</p>
      <h2>4. Third-party providers</h2><p>When you connect enrichment, AI or CRM providers, you do so under your own agreements with them and pay them directly.</p>
      <h2>5. Acceptable use</h2><p>No unlawful, deceptive or abusive use, no scraping, no attempts to bypass limits or security.</p>
      <h2>6. Fees</h2><p>Paid plans are billed monthly or annually in advance. Trials convert only when you add a payment method.</p>
      <h2>7. Liability</h2><p>To the extent permitted by law, our total liability is limited to the fees you paid in the 12 months before the claim.</p>
      <h2>8. Termination</h2><p>You may cancel at any time. We may suspend accounts that breach these terms.</p>
      <h2>9. Law</h2><p>These terms are governed by the laws of England and Wales.</p>
    </Legal>
  );
}
