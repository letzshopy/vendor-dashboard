import { LEGAL } from "@/config/legal";

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">

      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">
          Terms & Conditions
        </h1>
        <p className="mt-1 text-xs text-slate-500">
          Version 1.0 • Last updated: {new Date().toLocaleDateString("en-IN")}
        </p>
      </div>

      <div className="space-y-5 text-sm text-slate-700 leading-relaxed">

        <Section title="1. Introduction">
          These Terms govern your use of LetzShopy, operated by {LEGAL.entityName}. By using the platform, you agree to these Terms.
        </Section>

        <Section title="2. Platform Nature">
          LetzShopy is a Software-as-a-Service (SaaS) platform. It does not operate as a marketplace or intermediary.
        </Section>

        <Section title="3. Vendor Responsibility">
          Vendors are fully responsible for products, pricing, taxes, shipping, and customer handling.
        </Section>

        <Section title="4. Subscription & Billing">
          Access to services depends on active subscription. Non-payment may result in restriction.
        </Section>

        <Section title="5. GST & Tax Responsibility">
          LetzShopy is not an e-commerce operator under GST. Vendors are solely responsible for GST compliance.
        </Section>

        <Section title="6. Non-Marketplace Clarification">
          LetzShopy only provides technology infrastructure. Vendors independently manage their stores.
        </Section>

        <Section title="7. Indemnification">
          You agree to indemnify {LEGAL.entityName} against any claims arising from your business operations.
        </Section>

        <Section title="8. Limitation of Liability">
          {LEGAL.entityName} is not liable for indirect or consequential damages.
        </Section>

        <Section title="9. Governing Law">
          These terms are governed by {LEGAL.governingLaw}. Jurisdiction: {LEGAL.jurisdiction}.
        </Section>

        <Section title="10. Contact">
          For legal queries, contact {LEGAL.supportEmail}.
        </Section>

      </div>
    </div>
  );
}

function Section({ title, children }: any) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-2 font-semibold text-slate-900">{title}</h2>
      <p>{children}</p>
    </div>
  );
}