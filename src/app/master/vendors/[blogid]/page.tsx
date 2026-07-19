import Link from "next/link";
import DashboardAccessCard from "@/components/master/DashboardAccessCard";
import VendorKycReviewCard from "@/components/master/VendorKycReviewCard";
import MasterSubscriptionCard, {
  type MasterSubscriptionData,
} from "@/components/master/MasterSubscriptionCard";
import MasterDomainRenewalCard from "@/components/master/MasterDomainRenewalCard";
import {
  fetchMasterVendorDetail,
  type MasterVendorDetail,
} from "@/lib/masterOperations";
import { resolveMasterVendorStoreUrl } from "@/lib/masterVendor";

export const dynamic = "force-dynamic";

const INTERNAL_TOKEN = process.env.LETZ_INTERNAL_TOKEN || "";

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function textField(source: JsonRecord, ...keys: string[]): string {
  for (const key of keys) {
    if (typeof source[key] === "string") {
      return source[key].trim();
    }
  }

  return "";
}

async function fetchAuthoritativeSubscription(
  blogid: string
): Promise<MasterSubscriptionData> {
  if (!INTERNAL_TOKEN) {
    throw new Error(
      "Subscription services are not configured."
    );
  }

  const storeUrl = await resolveMasterVendorStoreUrl(blogid);

  const response = await fetch(
    `${storeUrl}/wp-json/letz/v1/subscription/status/?_ts=${Date.now()}`,
    {
      headers: {
        "x-letz-auth": INTERNAL_TOKEN,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
    }
  );

  const parsed: unknown = await response.json().catch(() => null);

  if (!response.ok || !isRecord(parsed)) {
    throw new Error("Could not load the authoritative vendor subscription.");
  }

  const amount = parsed.amount;

  return {
    storeUrl,
    plan: textField(parsed, "current_plan", "plan"),
    period: textField(parsed, "billing_cycle", "period"),
    status: textField(parsed, "billing_status", "status"),
    amount:
      typeof amount === "number" || typeof amount === "string" ? amount : 0,
    payment_mode: textField(parsed, "payment_mode"),
    payment_reference: textField(
      parsed,
      "payment_reference",
      "utr"
    ),
    last_paid_date: textField(
      parsed,
      "last_paid_date",
      "last_billed_at"
    ),
    next_payment_date: textField(
      parsed,
      "next_payment_date",
      "next_renewal_date",
      "next_renewal_at"
    ),
    last_billed_at: textField(parsed, "last_billed_at"),
    next_renewal_at: textField(
      parsed,
      "next_renewal_at",
      "next_renewal_date"
    ),
  };
}

function Pill({ on }: { on: boolean }) {
  return (
    <span
      className={[
        "rounded-full border px-2 py-1 text-xs",
        on
          ? "border-green-200 bg-green-50 text-green-700"
          : "border-slate-200 bg-slate-50 text-slate-600",
      ].join(" ")}
    >
      {on ? "Enabled" : "Off"}
    </span>
  );
}

export default async function VendorDetailPage({
  params,
}: {
  params: Promise<{ blogid: string }>;
}) {
  const { blogid } = await params;
  const [data, sub]: [MasterVendorDetail, MasterSubscriptionData] =
    await Promise.all([
      fetchMasterVendorDetail(blogid),
      fetchAuthoritativeSubscription(blogid),
    ]);

  const as = data.account_settings ?? {};
  const owner = as.owner ?? as.contact ?? as.profile ?? {};
  const business = as.business ?? as.company ?? as.shop ?? {};
  const access = data.dashboard_access ?? {};

  return (
    <div className="space-y-5 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm text-slate-400">Vendor</div>
          <h1 className="text-2xl font-semibold text-white">
            {data.site?.name ?? `Blog ${data.blogid}`}
          </h1>
          <div className="break-all text-xs text-slate-300">
            {data.site?.url}
          </div>
        </div>

        <div className="flex gap-2">
          {data.links?.store ? (
            <a
              href={data.links.store}
              target="_blank"
              rel="noreferrer"
              className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm text-white transition hover:bg-white/20"
            >
              Open Store
            </a>
          ) : null}

          {data.links?.dashboard ? (
            <a
              href={data.links.dashboard}
              target="_blank"
              rel="noreferrer"
              className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm text-white transition hover:bg-white/20"
            >
              Open Dashboard
            </a>
          ) : null}

          <Link
            href="/master/vendors"
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white transition hover:bg-white/10"
          >
            Back
          </Link>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white p-4 shadow-sm lg:col-span-2">
          <div className="mb-3 font-semibold text-slate-900">
            Profile & Business
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <div className="text-xs text-slate-500">Owner</div>
              <div className="text-sm text-slate-900">{owner.name ?? "-"}</div>
              <div className="text-xs text-slate-600">
                {owner.mobile ?? "-"}
              </div>
              <div className="break-all text-xs text-slate-600">
                {owner.email ?? "-"}
              </div>
            </div>

            <div>
              <div className="text-xs text-slate-500">Business</div>
              <div className="text-sm text-slate-900">
                {business.name ?? "-"}
              </div>
              <div className="text-xs text-slate-600">
                {business.category ?? "-"}
              </div>
              <div className="text-xs text-slate-600">
                {(business.city ?? "") +
                  (business.state ? `, ${business.state}` : "") || "-"}
              </div>
            </div>
          </div>
        </div>

        <DashboardAccessCard
          blogid={data.blogid}
          locked={!!access.locked}
          lockedAt={access.locked_at}
          lockedBy={access.locked_by}
          unlockedAt={access.unlocked_at}
          unlockedBy={access.unlocked_by}
          storefrontSuspended={
            !!access.storefront_suspended
          }
          storefrontSuspendedAt={
            access.storefront_suspended_at
          }
          storefrontSuspendedBy={
            access.storefront_suspended_by
          }
          storefrontRestoredAt={
            access.storefront_restored_at
          }
          storefrontRestoredBy={
            access.storefront_restored_by
          }
        />

        <VendorKycReviewCard
          blogid={data.blogid}
          vendorName={data.site?.name || `Blog ${data.blogid}`}
          storeUrl={data.site?.url || ""}
        />

        <MasterSubscriptionCard
          blogid={data.blogid}
          initial={sub}
          storeUrl={sub.storeUrl || data.site?.url || ""}
        />

        <MasterDomainRenewalCard
          blogid={data.blogid}
          storeUrl={data.site?.url || ""}
        />

        <div className="rounded-2xl border border-white/10 bg-white p-4 shadow-sm">
          <div className="mb-3 font-semibold text-slate-900">
            Payment Methods
          </div>

          <div className="flex flex-wrap gap-3 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-slate-900">UPI</span>
              <Pill on={!!data.payment_methods?.upi} />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-900">Easebuzz</span>
              <Pill on={!!data.payment_methods?.easebuzz} />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-900">COD</span>
              <Pill on={!!data.payment_methods?.cod} />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white p-4 shadow-sm">
          <div className="mb-3 font-semibold text-slate-900">Shipping</div>
          <div className="text-sm text-slate-900">
            Provider:{" "}
            <span className="font-medium">
              {data.shipping?.provider === "shift" ? "Shift" : "Self Shipping"}
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white p-4 shadow-sm">
          <div className="mb-3 font-semibold text-slate-900">Counts</div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-xl border p-3">
              <div className="text-2xl font-semibold text-slate-900">
                {data.counts?.products ?? 0}
              </div>
              <div className="text-xs text-slate-600">Products</div>
            </div>

            <div className="rounded-xl border p-3">
              <div className="text-2xl font-semibold text-slate-900">
                {data.counts?.orders ?? 0}
              </div>
              <div className="text-xs text-slate-600">Orders</div>
            </div>

            <div className="rounded-xl border p-3">
              <div className="text-2xl font-semibold text-slate-900">
                {data.counts?.media ?? 0}
              </div>
              <div className="text-xs text-slate-600">Media</div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white p-4 shadow-sm lg:col-span-3">
          <div className="mb-3 font-semibold text-slate-900">
            Support Tickets (Summary)
          </div>
          <div className="flex flex-wrap gap-3 text-sm text-slate-900">
            <span className="rounded-full border px-3 py-1">
              Open: {data.tickets?.open ?? 0}
            </span>
            <span className="rounded-full border px-3 py-1">
              Pending: {data.tickets?.pending ?? 0}
            </span>
            <span className="rounded-full border px-3 py-1">
              Closed: {data.tickets?.closed ?? 0}
            </span>
            <span className="self-center text-xs text-slate-500">
              (Tickets wiring comes next.)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
