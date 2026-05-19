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
          stores, shares, and protects personal data and business information in
          connection with the LetzShopy platform, vendor dashboard, storefront
          services, onboarding workflows, support systems, and related services.
          By using the platform, you acknowledge that you have read and
          understood this Privacy Policy.
        </p>
      </div>

      <div className="space-y-5 text-sm leading-7 text-slate-700">
        <Section title="1. Scope of this Policy">
          <p>
            This Privacy Policy applies to information collected through
            LetzShopy websites, vendor dashboards, onboarding forms, support
            tickets, communications, payment workflows, and related digital
            services operated by {LEGAL.entityName}.
          </p>
          <p className="mt-3">
            This policy applies to Vendors, prospective Vendors, users of the
            dashboard, and where relevant, customer information processed
            through Vendor stores in order to provide the platform services.
          </p>
        </Section>

        <Section title="2. Legal Basis and Compliance Framework">
          <p>
            We process digital personal data for lawful purposes connected with
            account creation, platform access, store operations, onboarding,
            billing, support, fraud prevention, security, and compliance. Our
            privacy approach is intended to align with applicable Indian data
            protection and information technology laws, including the Digital
            Personal Data Protection Act, 2023, the Digital Personal Data
            Protection Rules, 2025, the Information Technology Act, 2000, and
            the Information Technology (Reasonable Security Practices and
            Procedures and Sensitive Personal Data or Information) Rules, 2011. :contentReference[oaicite:0]{index=0}
          </p>
        </Section>

        <Section title="3. Information We Collect">
          <p>
            Depending on how you use LetzShopy, we may collect:
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-6">
            <li>
              account details such as name, email address, mobile number,
              business name, and login credentials;
            </li>
            <li>
              business and onboarding details such as store name, store URL,
              address, GST details, bank details, and subscription details;
            </li>
            <li>
              KYC and verification records such as identity proof, PAN, bank
              proof, tax documents, and related verification submissions;
            </li>
            <li>
              store configuration data such as branding, shipping settings, tax
              settings, payment settings, and legal page inputs;
            </li>
            <li>
              order and operational data such as products, categories, orders,
              invoices, shipping updates, support tickets, and dashboard usage;
            </li>
            <li>
              technical data such as IP address, browser type, device signals,
              session data, cookies, and logs needed for platform security and
              performance.
            </li>
          </ul>
        </Section>

        <Section title="4. Sensitive and Verification Information">
          <p>
            For onboarding, compliance, risk control, or internal verification,
            we may collect or receive identity and business verification
            information, including documents submitted for KYC or operational
            review. Such information is collected only where relevant to the
            service, activation, billing, or security process and is handled
            with restricted access controls.
          </p>
          <p className="mt-3">
            We request that Vendors submit only documents that are necessary for
            the stated purpose and avoid submitting unrelated personal data.
          </p>
        </Section>

        <Section title="5. How We Collect Information">
          <p>
            We collect information:
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-6">
            <li>directly from you during registration, onboarding, or support;</li>
            <li>
              when you update settings, create products, process orders, or use
              the dashboard;
            </li>
            <li>
              through cookies, logs, and technical tools used to operate and
              secure the platform;
            </li>
            <li>
              from integrations or service providers such as payment providers,
              hosting services, email delivery systems, logistics systems, or
              other connected tools you enable.
            </li>
          </ul>
        </Section>

        <Section title="6. How We Use Information">
          <p>
            We may use collected information to:
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-6">
            <li>create and manage Vendor accounts and stores;</li>
            <li>provide dashboard access and storefront functionality;</li>
            <li>process subscriptions, renewals, invoices, and billing records;</li>
            <li>support shipping, payment, reporting, and other store features;</li>
            <li>review onboarding and KYC submissions;</li>
            <li>respond to support requests and operational issues;</li>
            <li>detect fraud, abuse, security risks, or unauthorized activity;</li>
            <li>improve product features, reliability, and platform performance;</li>
            <li>
              comply with applicable legal, tax, contractual, and regulatory
              obligations.
            </li>
          </ul>
        </Section>

        <Section title="7. Customer Data Processed Through Vendor Stores">
          <p>
            Vendor stores may collect customer-facing information such as name,
            address, contact number, email address, order details, payment
            status, and shipping information. LetzShopy may process this
            information as part of providing the store software, checkout,
            order-management tools, shipping tools, invoicing, dashboard views,
            and support systems.
          </p>
          <p className="mt-3">
            The Vendor remains responsible for its own customer-facing privacy
            notices, product promises, tax treatment, and lawful handling of
            customer information collected through its store.
          </p>
        </Section>

        <Section title="8. Cookies, Sessions, and Similar Technologies">
          <p>
            We may use cookies, session storage, authentication tokens, and
            similar technologies to keep users signed in, remember preferences,
            secure access, improve performance, prevent abuse, and understand
            how the platform is being used.
          </p>
          <p className="mt-3">
            Some cookies are essential for login, dashboard security, and store
            operation. Disabling certain cookies may affect functionality.
          </p>
        </Section>

        <Section title="9. Sharing of Information">
          <p>
            We do not sell personal data to advertisers. We may share
            information only where reasonably necessary with:
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-6">
            <li>
              hosting, infrastructure, storage, and backup providers who help us
              operate the platform;
            </li>
            <li>
              payment service providers, banks, or gateway partners involved in
              transaction processing;
            </li>
            <li>
              courier, logistics, communication, OTP, email, or support service
              providers used in store operations;
            </li>
            <li>
              professional advisors, auditors, or legal consultants where needed
              for business or compliance purposes;
            </li>
            <li>
              government authorities, regulators, law enforcement agencies, or
              courts where disclosure is required by law or valid legal process.
            </li>
          </ul>
        </Section>

        <Section title="10. Third-Party Services and Integrations">
          <p>
            LetzShopy may integrate with third-party tools including payment
            gateways, logistics partners, plugins, cloud hosting providers,
            email delivery systems, analytics tools, support systems, and other
            business services. Information shared with or processed by those
            providers is subject to their own privacy and security practices in
            addition to this policy.
          </p>
          <p className="mt-3">
            We encourage Vendors to review the privacy terms of any third-party
            service they enable or use with the platform.
          </p>
        </Section>

        <Section title="11. Data Retention">
          <p>
            We retain information only for as long as reasonably necessary for
            the purposes described in this policy, including account
            administration, support, legal compliance, fraud prevention, tax and
            billing records, dispute handling, backup integrity, and business
            continuity.
          </p>
          <p className="mt-3">
            Retention periods may vary depending on the nature of the data, the
            service used, subscription status, dispute history, and legal
            requirements applicable to records or electronic information.
          </p>
        </Section>

        <Section title="12. Data Security">
          <p>
            We implement reasonable technical, administrative, and
            organizational safeguards designed to protect information against
            unauthorized access, misuse, accidental loss, alteration, or
            disclosure. Indian privacy and SPDI rules also require body
            corporates handling personal information to publish a privacy policy
            and maintain reasonable security practices. :contentReference[oaicite:1]{index=1}
          </p>
          <p className="mt-3">
            No internet-based system can be guaranteed to be completely secure.
            You are also responsible for maintaining account confidentiality,
            protecting passwords, and notifying us promptly of suspected misuse
            or unauthorized access.
          </p>
        </Section>

        <Section title="13. Data Accuracy and Vendor Responsibility">
          <p>
            You are responsible for ensuring that the information you submit to
            LetzShopy is accurate, current, and complete. If your contact
            details, tax details, banking information, store profile, or KYC
            documents change, you should update them promptly.
          </p>
        </Section>

        <Section title="14. Your Rights and Requests">
          <p>
            Subject to applicable law and operational limitations, you may
            request access to, correction of, or updating of your account and
            business information by contacting us at {LEGAL.supportEmail}. The
            DPDP Act, 2023 provides rights such as access to information about
            personal data processing, correction and erasure, grievance redress,
            and withdrawal of consent where applicable. :contentReference[oaicite:2]{index=2}
          </p>
          <p className="mt-3">
            We may require verification of identity or authority before acting
            on any privacy request.
          </p>
        </Section>

        <Section title="15. Children’s Data">
          <p>
            The LetzShopy platform is intended for business and commercial use
            and is not designed for children. You must not use the platform if
            you are not legally competent to enter into a contract. We do not
            knowingly seek to collect personal data from children for ordinary
            Vendor onboarding or store operation use cases.
          </p>
        </Section>

        <Section title="16. Cross-Border and Platform Infrastructure Processing">
          <p>
            Depending on the technology providers used to operate the platform,
            some information may be stored or processed through cloud systems,
            software tools, or service providers that operate across multiple
            regions. Where such processing occurs, we take reasonable steps to
            ensure that service arrangements remain appropriate for platform
            operation and lawful processing.
          </p>
        </Section>

        <Section title="17. Grievances and Complaints">
          <p>
            If you have a complaint, request, or question about privacy,
            personal data, account access, or information handling, please write
            to {LEGAL.supportEmail}. We will review requests in accordance with
            applicable law, platform records, and security requirements.
          </p>
        </Section>

        <Section title="18. Changes to this Privacy Policy">
          <p>
            We may update this Privacy Policy from time to time to reflect
            changes in law, technology, platform features, business practices,
            or operational requirements. The updated version becomes effective
            when published on the platform unless a later effective date is
            stated.
          </p>
        </Section>

        <Section title="19. Contact Information">
          <p>
            For privacy-related questions, legal notices, or data requests,
            please contact:
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