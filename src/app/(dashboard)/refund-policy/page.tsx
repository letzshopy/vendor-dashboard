import { LEGAL } from "@/config/legal";

export default function RefundPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">

      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">
          Refund & Cancellation Policy
        </h1>
        <p className="mt-1 text-xs text-slate-500">
          Version 1.0 • Last updated: {new Date().toLocaleDateString("en-IN")}
        </p>
      </div>

      <div className="space-y-5 text-sm text-slate-700 leading-relaxed">

        <Section title="1. Subscription Model">
          LetzShopy operates on a subscription basis.
        </Section>

        <Section title="2. No Refund Policy">
          Payments are non-refundable once processed.
        </Section>

        <Section title="3. Cancellation">
          Subscription continues till billing cycle end.
        </Section>

        <Section title="4. Service Delivery">
          Once access is granted, service is considered delivered.
        </Section>

        <Section title="5. Chargebacks">
          Unauthorized chargebacks may result in suspension.
        </Section>

        <Section title="6. Exceptions">
          Refunds allowed only for duplicate/system errors.
        </Section>

        <Section title="7. RBI Compliance">
          Payments handled via authorized gateways only.
        </Section>

        <Section title="8. Vendor Transactions">
          Vendors handle customer refunds independently.
        </Section>

        <Section title="9. Contact">
          For billing issues, contact {LEGAL.supportEmail}.
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