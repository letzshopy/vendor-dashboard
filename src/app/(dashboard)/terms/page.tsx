import { LEGAL } from "@/config/legal";

export default function TermsPage() {
  const lastUpdated = new Date().toLocaleDateString("en-IN");

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 md:px-6">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
          Terms &amp; Conditions
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Version 1.0 • Last updated: {lastUpdated}
        </p>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-600">
          These Terms &amp; Conditions govern access to and use of the LetzShopy
          platform and related services provided by {LEGAL.entityName}. By
          creating an account, accessing the dashboard, using any store, or
          subscribing to the service, you agree to be bound by these Terms.
        </p>
      </div>

      <div className="space-y-5 text-sm leading-7 text-slate-700">
        <Section title="1. Definitions">
          <p>
            In these Terms, <strong>“LetzShopy”</strong>, <strong>“we”</strong>,{" "}
            <strong>“our”</strong>, or <strong>“us”</strong> means{" "}
            {LEGAL.entityName}. <strong>“Vendor”</strong>, <strong>“you”</strong>
            , or <strong>“your”</strong> means the individual or business entity
            subscribing to and using the LetzShopy platform.{" "}
            <strong>“Platform”</strong> means the LetzShopy software, vendor
            dashboard, storefront system, hosted infrastructure, related APIs,
            support systems, and associated services. <strong>“Customer”</strong>{" "}
            means a person who places an order on a Vendor’s store.
          </p>
        </Section>

        <Section title="2. Acceptance of Terms">
          <p>
            By registering for an account, clicking to accept, paying a
            subscription fee, accessing the dashboard, or otherwise using the
            Platform, you acknowledge that you have read, understood, and agree
            to these Terms and our applicable policies. Electronic acceptance,
            electronic records, and electronic communications shall have full
            force and effect to the extent permitted by applicable law.
          </p>
        </Section>

        <Section title="3. Eligibility">
          <p>
            You may use the Platform only if you are legally capable of entering
            into a binding contract under applicable law. If you are accepting
            these Terms on behalf of a business, firm, proprietorship, LLP,
            company, or other legal entity, you represent that you have the
            authority to bind that entity to these Terms.
          </p>
        </Section>

        <Section title="4. Nature of Service">
          <p>
            LetzShopy is a software-as-a-service (SaaS) enablement platform that
            helps Vendors operate their own online stores. Unless expressly
            agreed otherwise in writing, LetzShopy provides technology,
            storefront infrastructure, dashboard access, and related support
            services only. LetzShopy does not become the owner of Vendor
            inventory, does not take title to Vendor products, and does not
            become the seller of record for products sold by Vendors through
            their individual stores.
          </p>
          <p className="mt-3">
            Each Vendor’s store is operated on the Vendor’s behalf, and the
            Vendor remains solely responsible for its products, offers, prices,
            taxes, shipping commitments, refunds, customer promises, store
            content, and applicable legal compliance.
          </p>
        </Section>

        <Section title="5. Account Registration and Security">
          <p>
            You agree to provide accurate, current, and complete information
            during onboarding and at all times during your use of the Platform.
            You are responsible for maintaining the confidentiality of your
            login credentials and for all actions taken under your account.
          </p>
          <p className="mt-3">
            You must immediately notify us if you suspect unauthorized access,
            credential compromise, or any other security incident affecting your
            account, store, or dashboard.
          </p>
        </Section>

        <Section title="6. Vendor Responsibilities">
          <p>
            The Vendor is solely responsible for:
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-6">
            <li>all products, descriptions, images, claims, and pricing;</li>
            <li>inventory management and stock accuracy;</li>
            <li>order fulfillment, dispatch, returns, exchanges, and refunds;</li>
            <li>customer support and complaint handling for store orders;</li>
            <li>tax collection, invoicing accuracy, and statutory compliance;</li>
            <li>ensuring that products and content are lawful and non-infringing;</li>
            <li>
              obtaining all registrations, licenses, permits, and approvals
              required for the Vendor’s business.
            </li>
          </ul>
          <p className="mt-3">
            The Vendor shall not upload, sell, promote, or distribute any
            prohibited, unlawful, misleading, infringing, counterfeit, unsafe,
            or restricted goods or content through the Platform.
          </p>
        </Section>

        <Section title="7. Onboarding, Verification, and KYC">
          <p>
            LetzShopy may require the Vendor to provide onboarding documents,
            identity proof, business details, bank details, tax information,
            and/or other verification records before or after activation of a
            store. The Vendor warrants that all documents and information
            submitted are genuine, current, and belong to the Vendor or its
            authorized representatives.
          </p>
          <p className="mt-3">
            We reserve the right to request clarification, additional documents,
            re-verification, or updated records at any time. Failure to provide
            satisfactory information may result in delayed activation,
            limitation of services, suspension, or termination.
          </p>
        </Section>

        <Section title="8. Subscription Plans, Billing, and Renewal">
          <p>
            Access to the Platform is subject to the subscription plan selected
            by the Vendor. Pricing, billing cycle, included features, and
            service scope may vary by plan. Subscription fees are payable in
            advance unless expressly stated otherwise.
          </p>
          <p className="mt-3">
            If the Vendor fails to pay subscription fees on time, LetzShopy may
            restrict access to some or all services, suspend the store or
            dashboard, disable new activity, or terminate the subscription after
            notice, without prejudice to any amounts already due.
          </p>
          <p className="mt-3">
            Subscription fees are generally non-refundable once paid, except
            where a refund is expressly promised by LetzShopy in writing or
            required by applicable law.
          </p>
        </Section>

        <Section title="9. Payment Collection and Settlement">
          <p>
            The Platform may support payment methods such as UPI, payment
            gateway integrations, manual payment confirmation, COD, or other
            methods made available from time to time. Where customer payments
            are collected through infrastructure provided, configured, or routed
            via the Platform, such collection does not by itself transfer
            product ownership or seller responsibility to LetzShopy.
          </p>
          <p className="mt-3">
            The Vendor acknowledges that payment gateway charges, banking
            charges, reversals, disputes, chargebacks, refunds, settlement
            timing, and related transaction issues may be subject to the rules
            of the relevant payment service provider, bank, or financial
            institution. LetzShopy is not responsible for delays or deductions
            made by such third parties unless caused directly by our own wilful
            misconduct.
          </p>
        </Section>

        <Section title="10. Taxes and Regulatory Compliance">
          <p>
            The Vendor is solely responsible for determining and complying with
            all tax obligations applicable to its business, products, sales,
            invoices, shipping, and customer transactions, including but not
            limited to GST, income tax, professional tax, local levies, and any
            industry-specific requirements.
          </p>
          <p className="mt-3">
            LetzShopy provides software tools and configurable tax settings for
            operational convenience only. Such features do not constitute legal,
            tax, or accounting advice. The Vendor must independently verify all
            tax positions with a qualified professional before relying on any
            Platform-generated settings, rates, or documents.
          </p>
        </Section>

        <Section title="11. Store Content and Intellectual Property">
          <p>
            The Vendor retains ownership of its trademarks, logos, product
            images, store content, and business materials that it uploads or
            provides to the Platform, subject to the license granted below.
          </p>
          <p className="mt-3">
            The Vendor grants LetzShopy a non-exclusive, revocable,
            royalty-free license to host, reproduce, process, display, format,
            and use such content solely to provide, maintain, support, improve,
            and secure the Platform and the Vendor’s store.
          </p>
          <p className="mt-3">
            All rights in the LetzShopy platform, code, dashboards, templates,
            design system, software workflows, service marks, branding, and
            proprietary systems remain the exclusive property of {LEGAL.entityName}
            or its licensors.
          </p>
        </Section>

        <Section title="12. Acceptable Use and Prohibited Conduct">
          <p>
            You agree not to:
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-6">
            <li>use the Platform for unlawful, fraudulent, or abusive activity;</li>
            <li>
              upload malware, harmful code, deceptive content, or material that
              interferes with platform security or performance;
            </li>
            <li>misrepresent products, business identity, approvals, or pricing;</li>
            <li>
              infringe third-party intellectual property, privacy, publicity, or
              other rights;
            </li>
            <li>
              copy, reverse engineer, scrape, resell, sublicense, or exploit the
              Platform except as expressly permitted;
            </li>
            <li>
              use the Platform in a way that could expose LetzShopy, other
              Vendors, or Customers to legal or operational harm.
            </li>
          </ul>
        </Section>

        <Section title="13. Privacy and Data Handling">
          <p>
            The Platform may process business information, order information,
            customer contact details, store content, and other digital personal
            data as necessary to provide the services. Each party shall comply
            with applicable data protection and privacy laws in relation to the
            personal data it controls or processes.
          </p>
          <p className="mt-3">
            The Vendor is responsible for ensuring that it has an appropriate
            lawful basis, notice, and permissions where required for the
            collection and use of customer and staff data through its store. Our
            handling of data is also governed by the applicable Privacy Policy
            and related operational policies published by LetzShopy.
          </p>
        </Section>

        <Section title="14. Third-Party Services">
          <p>
            The Platform may integrate with or rely on third-party services,
            including payment gateways, SMS/OTP providers, hosting providers,
            email systems, logistics providers, WordPress/WooCommerce plugins,
            analytics tools, or domain providers. Such services are controlled
            by third parties and may be subject to their own terms, pricing,
            availability, and privacy practices.
          </p>
          <p className="mt-3">
            LetzShopy is not liable for downtime, changes, breaches, errors, or
            service interruptions caused by third-party systems beyond our
            reasonable control.
          </p>
        </Section>

        <Section title="15. Availability, Maintenance, and Changes">
          <p>
            We may modify, update, improve, limit, suspend, or discontinue any
            part of the Platform, features, integrations, or plans at any time,
            including for maintenance, security, compliance, capacity planning,
            or product evolution. We will make reasonable efforts to avoid
            material disruption where practicable, but uninterrupted
            availability is not guaranteed.
          </p>
        </Section>

        <Section title="16. Suspension and Termination">
          <p>
            LetzShopy may suspend or terminate access to the Platform, in whole
            or in part, immediately or after notice, if:
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-6">
            <li>the Vendor breaches these Terms or any policy;</li>
            <li>payment remains overdue;</li>
            <li>verification information is false, incomplete, or disputed;</li>
            <li>
              the Vendor uses the Platform in a way that is unlawful, harmful,
              risky, or technically abusive;
            </li>
            <li>
              continued service may expose LetzShopy to legal, regulatory,
              reputational, or security risk.
            </li>
          </ul>
          <p className="mt-3">
            Upon termination, the Vendor’s right to access and use the Platform
            ends immediately, subject to any limited access or data export
            support we may choose to provide at our discretion.
          </p>
        </Section>

        <Section title="17. Disclaimer of Warranties">
          <p>
            The Platform is provided on an <strong>“as is”</strong> and{" "}
            <strong>“as available”</strong> basis. To the maximum extent
            permitted by law, {LEGAL.entityName} disclaims all warranties,
            whether express, implied, statutory, or otherwise, including implied
            warranties of merchantability, fitness for a particular purpose,
            title, non-infringement, uninterrupted availability, and error-free
            operation.
          </p>
        </Section>

        <Section title="18. Limitation of Liability">
          <p>
            To the maximum extent permitted by law, {LEGAL.entityName}, its
            promoters, directors, employees, affiliates, service providers, and
            licensors shall not be liable for any indirect, incidental, special,
            punitive, exemplary, or consequential damages, including loss of
            profits, data, goodwill, business opportunity, or reputation,
            arising out of or relating to the Platform or these Terms.
          </p>
          <p className="mt-3">
            Our aggregate liability for direct damages arising from the
            Platform or these Terms shall not exceed the subscription fees
            actually paid by the Vendor to LetzShopy for the three months
            immediately preceding the event giving rise to the claim, or
            INR 10,000, whichever is lower, except where a different limit is
            required by non-excludable law.
          </p>
        </Section>

        <Section title="19. Indemnity">
          <p>
            The Vendor agrees to defend, indemnify, and hold harmless{" "}
            {LEGAL.entityName}, its affiliates, officers, employees, and
            representatives from and against all claims, demands, actions,
            proceedings, damages, liabilities, penalties, losses, costs, and
            expenses, including reasonable legal fees, arising out of or related
            to:
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-6">
            <li>the Vendor’s products, services, content, or business conduct;</li>
            <li>the Vendor’s breach of these Terms or applicable law;</li>
            <li>tax, consumer, product, shipping, refund, or IP disputes;</li>
            <li>
              any allegation that Vendor content, products, or conduct infringes
              third-party rights or violates law.
            </li>
          </ul>
        </Section>

        <Section title="20. Force Majeure">
          <p>
            LetzShopy shall not be liable for any delay, interruption, or
            failure to perform caused by events beyond its reasonable control,
            including natural disasters, internet outages, cyberattacks,
            governmental action, war, labour disruption, epidemic, power
            failures, hosting failure, payment network failure, or breakdown of
            external service providers.
          </p>
        </Section>

        <Section title="21. Changes to These Terms">
          <p>
            We may update or revise these Terms from time to time. Revised Terms
            become effective upon publication on the Platform or on such later
            date as may be specified. Continued use of the Platform after the
            effective date of updated Terms constitutes acceptance of the revised
            Terms.
          </p>
        </Section>

        <Section title="22. Governing Law and Jurisdiction">
          <p>
            These Terms shall be governed by and construed in accordance with{" "}
            {LEGAL.governingLaw}. Subject to any mandatory rights available
            under applicable law, the courts at {LEGAL.jurisdiction} shall have
            exclusive jurisdiction over disputes arising out of or relating to
            these Terms or the Platform.
          </p>
        </Section>

        <Section title="23. Contact">
          <p>
            For legal notices, compliance matters, or questions regarding these
            Terms, you may contact us at <strong>{LEGAL.supportEmail}</strong>.
          </p>
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