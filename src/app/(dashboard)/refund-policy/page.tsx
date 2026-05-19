import { LEGAL } from "@/config/legal";

export default function RefundPage() {
  const lastUpdated = new Date().toLocaleDateString("en-IN");

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 md:px-6">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
          Refund &amp; Cancellation Policy
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Version 1.0 • Last updated: {lastUpdated}
        </p>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-600">
          This Refund &amp; Cancellation Policy explains the rules applicable to
          subscription fees, renewals, service activation, and billing-related
          refunds for LetzShopy. This policy applies only to payments made to{" "}
          {LEGAL.entityName} for LetzShopy platform access, subscription plans,
          onboarding, setup, and related SaaS services. It does not apply to
          customer refunds issued by Vendors to their own store customers.
        </p>
      </div>

      <div className="space-y-5 text-sm leading-7 text-slate-700">
        <Section title="1. Scope of this Policy">
          <p>
            LetzShopy operates as a subscription-based software and store
            enablement platform. This policy governs cancellation, refund,
            renewal, and billing treatment for LetzShopy subscription plans,
            onboarding fees, setup services, and related platform charges paid
            directly to {LEGAL.entityName}.
          </p>
          <p className="mt-3">
            This policy does not govern refunds for products sold by Vendors
            through their individual stores. Vendors remain solely responsible
            for product returns, cancellations, exchanges, and refunds relating
            to their own customer orders.
          </p>
        </Section>

        <Section title="2. Subscription-Based Service Model">
          <p>
            LetzShopy provides access to hosted software, dashboard tools, store
            infrastructure, onboarding support, configuration services, and
            related digital business services on a subscription basis. Charges
            may include monthly fees, annual fees, onboarding charges, setup
            charges, renewal charges, or other plan-specific service fees as
            communicated at the time of purchase.
          </p>
          <p className="mt-3">
            Once an account is activated, access is granted, setup work begins,
            or platform resources are allocated, the service is treated as
            commenced and digitally delivered.
          </p>
        </Section>

        <Section title="3. No Refund After Service Activation">
          <p>
            Unless otherwise expressly stated in writing by {LEGAL.entityName},
            subscription fees, setup charges, onboarding fees, and renewal
            payments are non-refundable once any of the following has occurred:
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-6">
            <li>your account has been created or activated;</li>
            <li>your store has been provisioned, configured, or assigned;</li>
            <li>dashboard access has been shared;</li>
            <li>setup, onboarding, migration, or configuration work has begun;</li>
            <li>the subscription term has started;</li>
            <li>digital platform access has been made available to you.</li>
          </ul>
        </Section>

        <Section title="4. Cancellation by Vendor">
          <p>
            A Vendor may choose to discontinue the service at any time by
            notifying LetzShopy or by not renewing the subscription. However,
            cancellation does not automatically create a right to a refund for
            the current billing period.
          </p>
          <p className="mt-3">
            If you cancel after the billing cycle has started, your subscription
            will ordinarily continue until the end of the active billing period,
            unless earlier suspension or termination is required under the Terms
            and Conditions or due to policy violation, non-payment, misuse, or
            legal reasons.
          </p>
        </Section>

        <Section title="5. Monthly and Annual Plans">
          <p>
            LetzShopy may offer monthly or annual subscription plans. By making
            payment for a plan, you authorize LetzShopy to provide access and
            services for the selected term.
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-6">
            <li>
              Monthly plans are billed for one month at a time and are generally
              non-refundable once the monthly cycle starts.
            </li>
            <li>
              Annual plans are billed upfront for the full year and are
              generally non-refundable once the annual term starts.
            </li>
            <li>
              Any promotional pricing, discount, or bundled offer applies only
              to the original purchased term unless otherwise stated.
            </li>
          </ul>
        </Section>

        <Section title="6. Renewal Charges">
          <p>
            Renewal payments are treated as continuation of the subscribed
            service. Once a renewal payment is successfully processed and the
            next subscription term is activated or reserved, the renewal amount
            is generally non-refundable.
          </p>
          <p className="mt-3">
            If a Vendor does not wish to continue into the next billing period,
            it is the Vendor&apos;s responsibility to request cancellation or
            stop renewal before the next charge is processed, where such control
            is available.
          </p>
        </Section>

        <Section title="7. Trial Periods and Introductory Access">
          <p>
            If LetzShopy offers a free trial, limited trial, demo access, or
            temporary onboarding period, the Vendor is expected to evaluate the
            service during that period. Once the trial converts into a paid
            subscription, or once a paid onboarding or activation fee is paid
            and service work begins, the refund rules in this policy apply.
          </p>
        </Section>

        <Section title="8. Cases Where Refunds May Be Considered">
          <p>
            Refunds are not the standard rule and may be considered only at the
            sole discretion of {LEGAL.entityName} in limited situations such as:
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-6">
            <li>duplicate payment for the same invoice or billing cycle;</li>
            <li>proven payment system error resulting in excess charge;</li>
            <li>
              accidental multiple debit for the same subscription due to a
              technical issue;
            </li>
            <li>
              charge captured by LetzShopy but service could not be provisioned
              at all and no meaningful setup or activation work was performed;
            </li>
            <li>
              any other case expressly approved in writing by LetzShopy after
              internal review.
            </li>
          </ul>
          <p className="mt-3">
            Even in such cases, LetzShopy may require transaction details, proof
            of payment, bank reference, UTR, gateway reference, invoice
            reference, or other information before reviewing the request.
          </p>
        </Section>

        <Section title="9. Non-Refundable Items">
          <p>
            The following are ordinarily non-refundable, except where required
            by applicable law or expressly approved by LetzShopy:
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-6">
            <li>subscription fees for active billing periods;</li>
            <li>annual or monthly access charges once activated;</li>
            <li>onboarding or setup fees after work has started;</li>
            <li>custom configuration or store setup work already delivered;</li>
            <li>domain, email, third-party, or infrastructure costs incurred;</li>
            <li>migration, branding, content, catalog, or listing support already performed;</li>
            <li>fees paid under promotional or discounted non-refundable plans.</li>
          </ul>
        </Section>

        <Section title="10. Vendor Store Transactions and Customer Refunds">
          <p>
            LetzShopy only provides software, store infrastructure, and related
            services. Refunds relating to customer purchases made from a
            Vendor&apos;s store are the sole responsibility of that Vendor.
          </p>
          <p className="mt-3">
            LetzShopy is not responsible for deciding, approving, processing, or
            funding refunds for products sold by Vendors to end customers,
            except where LetzShopy is separately acting under a specific written
            managed-services arrangement and even then only to the extent
            expressly agreed.
          </p>
        </Section>

        <Section title="11. Payment Failures, Reversals, and Chargebacks">
          <p>
            If a payment is disputed, reversed, charged back, or reported as
            unauthorized, LetzShopy may temporarily suspend or permanently
            restrict platform access, account features, or store services until
            the matter is resolved.
          </p>
          <p className="mt-3">
            Where a chargeback or reversal is raised for a payment relating to a
            validly activated service, LetzShopy reserves the right to contest
            the dispute and provide invoices, logs, access records,
            communications, setup records, and service-delivery evidence to the
            relevant bank, payment gateway, processor, or legal authority.
          </p>
        </Section>

        <Section title="12. Suspension or Termination for Policy Breach">
          <p>
            No refund shall ordinarily be due where LetzShopy suspends,
            restricts, or terminates an account due to breach of platform terms,
            misuse, fraud, illegal activity, abusive conduct, false documents,
            non-payment, prohibited business activity, or security-related risk.
          </p>
        </Section>

        <Section title="13. Processing Time for Approved Refunds">
          <p>
            If LetzShopy approves a refund, the refund will usually be processed
            back through the original payment method where feasible, or through
            another lawful method determined appropriate by LetzShopy.
          </p>
          <p className="mt-3">
            Actual credit timelines may vary depending on the payment gateway,
            banking network, UPI provider, card issuer, or financial
            institution. LetzShopy is not responsible for delays caused by
            third-party financial systems after the refund instruction has been
            initiated.
          </p>
        </Section>

        <Section title="14. Taxes, Gateway Fees, and Third-Party Charges">
          <p>
            Where permitted, LetzShopy may deduct non-recoverable payment
            gateway charges, banking charges, taxes, third-party domain costs,
            email service costs, or other externally incurred charges from any
            approved refund, to the extent such amounts cannot be reversed or
            recovered.
          </p>
        </Section>

        <Section title="15. How to Request Billing Support or Refund Review">
          <p>
            If you believe you were charged incorrectly, you may contact
            LetzShopy for billing review by writing to {LEGAL.supportEmail}.
            Please include all relevant details, including:
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-6">
            <li>your account or store name;</li>
            <li>registered email and phone number;</li>
            <li>payment date and amount;</li>
            <li>invoice number, order number, or subscription reference;</li>
            <li>UTR, gateway reference, or bank transaction proof;</li>
            <li>a clear explanation of the issue.</li>
          </ul>
        </Section>

        <Section title="16. Policy Interpretation">
          <p>
            This policy is intended to apply specifically to digital SaaS access,
            onboarding, subscription billing, and LetzShopy platform services.
            In case of conflict between this policy and a separately signed
            agreement, enterprise arrangement, or written commercial proposal,
            the specific written agreement may prevail to the extent of that
            conflict.
          </p>
        </Section>

        <Section title="17. Changes to this Policy">
          <p>
            LetzShopy may update this Refund &amp; Cancellation Policy from time
            to time to reflect changes in pricing models, subscription workflow,
            payment systems, platform operations, or legal requirements. The
            updated version becomes effective when published, unless otherwise
            stated.
          </p>
        </Section>

        <Section title="18. Contact">
          <p>
            For subscription billing questions, payment issues, cancellation
            requests, or refund review requests, please contact:
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