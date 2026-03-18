import { LEGAL } from "@/config/legal";

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">

      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">
          Privacy Policy
        </h1>
        <p className="mt-1 text-xs text-slate-500">
          Version 1.0 • Last updated: {new Date().toLocaleDateString("en-IN")}
        </p>
      </div>

      <div className="space-y-5 text-sm text-slate-700 leading-relaxed">

        <Section title="1. Overview">
          This policy explains how {LEGAL.entityName} collects and uses data in compliance with Indian IT laws.
        </Section>

        <Section title="2. Data Collected">
          Personal, business, and KYC information is collected for onboarding and verification.
        </Section>

        <Section title="3. Usage">
          Data is used for account management, billing, and platform improvement.
        </Section>

        <Section title="4. Data Security">
          We implement safeguards to protect user data.
        </Section>

        <Section title="5. Third-Party Services">
          Payment gateways and hosting providers may process data as required.
        </Section>

        <Section title="6. Cookies">
          Used for session and performance improvements.
        </Section>

        <Section title="7. Data Sharing">
          We do not sell personal data.
        </Section>

        <Section title="8. Legal Compliance">
          This complies with IT Act, 2000.
        </Section>

        <Section title="9. User Rights">
          Users may request data changes via {LEGAL.supportEmail}.
        </Section>

        <Section title="10. Contact">
          Contact: {LEGAL.supportEmail}
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