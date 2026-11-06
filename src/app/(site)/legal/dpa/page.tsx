import type { Metadata } from "next";
import { Legal } from "@/components/site/legal";
export const metadata: Metadata = { title: "Data processing addendum" };
export default function Dpa() {
  return (
    <Legal title="Data processing addendum" updated="5 November 2026">
      <p><strong>Stub.</strong> This page outlines the DPA we will offer to customers. A signable version will be available on request from the <a href="/contact">contact form</a>.</p>
      <h2>Scope</h2><p>Processing of lead personal data by Velaroute on behalf of the customer, for the purpose of providing the service.</p>
      <h2>Processor obligations</h2><ul><li>Process only on documented instructions</li><li>Confidentiality of personnel</li><li>Appropriate technical and organisational measures (see <a href="/security">Security</a>)</li><li>Assistance with data subject requests and breach notification without undue delay</li><li>Deletion or return of data at the end of the service</li></ul>
      <h2>International transfers</h2><p>Where data leaves the UK/EEA, we will rely on the UK IDTA / EU Standard Contractual Clauses.</p>
      <h2>Sub-processors</h2><p>Listed in the <a href="/legal/privacy">privacy policy</a>; customers will be notified of changes.</p>
    </Legal>
  );
}
