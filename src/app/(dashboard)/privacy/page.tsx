import { LEGAL } from "@/config/legal";

export default function PrivacyPage() {
  const lastUpdated = new Date().toLocaleDateString("en-IN");

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 md:px-6">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
          Privacy Policy
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Version 1.0 • Last updated: {lastUpdated}
        </p>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-600">
          This Privacy Policy explains how {LEGAL.entityName} collects, uses,
          stores, shares, and protects personal and business information when
          you use LetzShopy and related services.
        </p>
      </div>

      <div className="space-y-5 text-sm leading-7 text-slate-700">
        <Section title="1. Scope of this Policy">
          <p>
            This Privacy Policy applies to Vendors, prospective Vendors,
            authorized users, visitors, and others who interact with LetzShopy,
            including through our website, dashboard, onboarding process,
            support channels, billing systems, and related communications.
          </p>
        </Section>

        <Section title="2. Information We Collect">
          <p>We may collect the following categories of information:</p>
          <ul className="mt-3 list-disc space-y-2 pl-6">
            <li>name, email address, mobile number, and contact details;</li>
            <li>business name, store information, and billing details;</li>
            <li>KYC and verification documents submitted during onboarding;</li>
            <li>subscription, billing, invoice, and payment records;</li>
            <li>store configuration, order, shipping, and operational data;</li>
            <li>support ticket messages, emails, and service interactions;</li>
            <li>technical information such as IP address, browser, and device data.</li>
          </ul>
        </Section>

        <Section title="3. How We Use Information">
          <p>We use your information for purposes including:</p>
          <ul className="mt-3 list-disc space-y-2 pl-6">
            <li>creating and managing your LetzShopy account;</li>
            <li>verifying business identity and onboarding Vendors;</li>
            <li>providing dashboard access, store setup, and support;</li>
            <li>processing subscriptions, invoices, and billing;</li>
            <li>maintaining platform security and preventing misuse;</li>
            <li>communicating service updates, support responses, and notices;</li>
            <li>improving platform performance and user experience;</li>
            <li>complying with legal, regulatory, tax, and contractual obligations.</li>
          </ul>
        </Section>

        <Section title="4. KYC and Verification Data">
          <p>
            Where KYC, identity, address, or bank-related information is
            collected, such information is used only for Vendor verification,
            internal compliance, recordkeeping, billing support, risk checks,
            and operational purposes connected with LetzShopy services.
          </p>
          <p className="mt-3">
            Such documents are not sold and are not publicly displayed on your
            storefront.
          </p>
        </Section>

        <Section title="5. Payment and Billing Information">
          <p>
            Subscription and billing payments may be processed through payment
            gateways, banking partners, UPI systems, or other financial service
            providers. We may store transaction metadata such as invoice number,
            payment status, UTR, gateway reference, or billing history, but we
            do not intentionally store full card data unless handled securely by
            an authorized payment processor.
          </p>
        </Section>

        <Section title="6. Cookies and Technical Data">
          <p>
            We may use cookies, sessions, local storage, and similar
            technologies to maintain login state, improve performance, remember
            preferences, protect accounts, and analyze platform usage.
          </p>
        </Section>

        <Section title="7. Sharing of Information">
          <p>
            We do not sell personal data. We may share information only where
            reasonably necessary, including with:
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-6">
            <li>hosting, infrastructure, and cloud service providers;</li>
            <li>payment gateways, banks, and billing providers;</li>
            <li>email, communication, or notification service providers;</li>
            <li>support, security, analytics, or fraud-prevention vendors;</li>
            <li>professional advisors, auditors, or legal authorities when required.</li>
          </ul>
        </Section>

        <Section title="8. Data Retention">
          <p>
            We retain information for as long as reasonably required for service
            delivery, account maintenance, compliance, billing, dispute
            resolution, security, and legal recordkeeping. Retention periods may
            vary depending on the type of information and applicable legal or
            operational requirements.
          </p>
        </Section>

        <Section title="9. Data Security">
          <p>
            We implement reasonable administrative, technical, and operational
            safeguards to protect personal and business data from unauthorized
            access, misuse, loss, destruction, or disclosure. However, no
            digital platform or method of transmission can be guaranteed to be
            completely secure.
          </p>
        </Section>

        <Section title="10. Vendor Responsibility for Customer Data">
          <p>
            Vendors may independently collect and manage customer names,
            addresses, phone numbers, order information, and related data
            through their own stores. Vendors remain responsible for their own
            customer-facing privacy compliance, store policies, and lawful use
            of customer data collected through their storefront operations.
          </p>
        </Section>

        <Section title="11. Your Rights and Requests">
          <p>
            Subject to applicable law, you may request access to, correction of,
            or update to your account information by contacting{" "}
            {LEGAL.supportEmail}. We may need to verify identity before acting
            on certain requests.
          </p>
        </Section>

        <Section title="12. Legal and Regulatory Compliance">
          <p>
            We aim to handle information in accordance with applicable Indian
            legal requirements, including relevant provisions of the Information
            Technology Act, 2000 and associated rules, and other applicable
            privacy or data protection requirements as may apply to our
            operations.
          </p>
        </Section>

        <Section title="13. Changes to this Policy">
          <p>
            We may update this Privacy Policy from time to time to reflect
            changes in services, legal obligations, security practices, or
            platform operations. The updated version becomes effective when
            published unless stated otherwise.
          </p>
        </Section>

        <Section title="14. Contact">
          <p>
            For privacy-related questions, requests, or concerns, please contact:
          </p>
          <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p>
              <strong>{LEGAL.entityName}</strong>
            </p>
            <p>Email: {LEGAL.supportEmail}</p>
            {LEGAL.address ? <p>Address: {LEGAL.address}</p> : null}
          </div>
        </Section>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
      <h2 className="mb-3 text-lg font-semibold text-slate-900">{title}</h2>
      <div className="space-y-3 text-sm leading-7 text-slate-700">
        {children}
      </div>
    </section>
  );
}