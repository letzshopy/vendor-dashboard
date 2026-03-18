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
          This Vendor Agreement is entered between you ("Vendor") and {LEGAL.entityName}.
          By using LetzShopy, you agree to operate independently and comply with this agreement.
        </Section>

        <Section title="2. Independent Business">
          Vendors operate their own business. LetzShopy is only a SaaS platform and does not act as a marketplace, seller, or intermediary.
        </Section>

        <Section title="3. Product & Order Responsibility">
          Vendors are solely responsible for product listings, pricing, order fulfillment, delivery, returns, and customer support.
        </Section>

        <Section title="4. Payment Handling">
          Payments collected from customers belong to the vendor. LetzShopy does not take ownership of transactions.
        </Section>

        <Section title="5. GST & Tax Responsibility">
          Vendors are fully responsible for GST registration, invoicing, tax filing, and compliance. LetzShopy is not liable for vendor tax obligations.
        </Section>

        <Section title="6. Platform Usage">
          Vendors agree not to misuse the platform for illegal, fraudulent, or misleading activities.
        </Section>

        <Section title="7. Limitation of Liability">
          {LEGAL.entityName} shall not be liable for any disputes, losses, or damages arising from vendor operations.
        </Section>

        <Section title="8. Termination">
          LetzShopy may suspend access in case of non-payment, fraud, or policy violations.
        </Section>

        <Section title="9. Governing Law">
          This agreement is governed by {LEGAL.governingLaw}. Jurisdiction: {LEGAL.jurisdiction}.
        </Section>

        <Section title="10. Contact">
          {LEGAL.supportEmail}
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