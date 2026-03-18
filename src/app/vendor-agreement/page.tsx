import { LEGAL } from "@/config/legal";

export default function VendorAgreementPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">
          Vendor Agreement
        </h1>
        <p className="mt-1 text-xs text-slate-500">
          Version 1.0 • Last updated: {new Date().toLocaleDateString("en-IN")}
        </p>
      </div>

      <div className="space-y-5 text-sm text-slate-700 leading-relaxed">
        <Section title="1. Agreement Overview">
          This Vendor Agreement is entered into between you as the Vendor and {LEGAL.entityName}.
          By using LetzShopy, you agree to operate independently and comply with this agreement.
        </Section>

        <Section title="2. Independent Business Model">
          LetzShopy is a Software-as-a-Service platform. It does not operate as a marketplace,
          reseller, or intermediary for your products. Your store remains independently operated by you.
        </Section>

        <Section title="3. Product and Order Responsibility">
          You are solely responsible for product listings, descriptions, pricing, taxation, stock,
          order fulfillment, delivery, cancellations, refunds, and customer support.
        </Section>

        <Section title="4. Payment Responsibility">
          Payments collected from customers belong to the Vendor. LetzShopy only provides technology
          infrastructure and does not assume ownership of customer transactions.
        </Section>

        <Section title="5. GST and Tax Compliance">
          You are solely responsible for your GST registration status, tax invoicing, filings, and
          compliance. LetzShopy does not act as an e-commerce operator or marketplace for GST purposes.
        </Section>

        <Section title="6. Acceptable Use">
          You agree not to use the platform for unlawful, fraudulent, misleading, infringing, or
          prohibited activities.
        </Section>

        <Section title="7. Limitation of Liability">
          {LEGAL.entityName} shall not be liable for losses, claims, customer disputes, tax disputes,
          delivery issues, or damages arising from Vendor operations.
        </Section>

        <Section title="8. Suspension and Termination">
          LetzShopy may suspend or terminate access for non-payment, fraud, abuse, or violation of
          platform policies.
        </Section>

        <Section title="9. Governing Law and Jurisdiction">
          This agreement is governed by {LEGAL.governingLaw}. Jurisdiction shall be subject to courts in {LEGAL.jurisdiction}.
        </Section>

        <Section title="10. Contact">
          For agreement-related queries, contact {LEGAL.supportEmail}.
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