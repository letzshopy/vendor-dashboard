import Link from "next/link";

export const dynamic = "force-dynamic";

type VendorDetail = {
  blogid: number;
  site: { name: string; url: string };
  account_settings: any;
  payment_methods: { upi: boolean; easebuzz: boolean; cod: boolean };
  shipping: { provider: "self" | "shift" | string };
  counts: {
    products: number;
    orders: number;
    media: number;
    orders_by_status?: Record<string, number>;
  };
  tickets: { open: number; pending: number; closed: number };
  subscription: {
    plan?: string;
    period?: string;
    last_billed_at?: string;
    next_renewal_at?: string;
    status?: string;
  };
  links: { store?: string; dashboard?: string };
};

function authHeader() {
  const WP_USER = process.env.WP_USER!;
  const WP_APP_PASSWORD = process.env.WP_APP_PASSWORD!;
  return "Basic " + Buffer.from(`${WP_USER}:${WP_APP_PASSWORD}`).toString("base64");
}

async function getVendor(blogid: string) {
  const WP_URL = process.env.MASTER_WP_URL!;
  const key = process.env.MASTER_API_KEY!;

  const res = await fetch(`${WP_URL}/wp-json/letz/v1/master-vendors/${blogid}`, {
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${key}`,       // ✅ most reliable
      "X-Letz-Master-Key": key,             // ✅ extra fallback
    },
  });

  const text = await res.text();
  if (!res.ok) throw new Error(`Failed vendor detail: ${res.status}\n\n${text.slice(0, 2000)}`);
  return JSON.parse(text);
}

function Pill({ on }: { on: boolean }) {
  return (
    <span
      className={[
        "text-xs px-2 py-1 rounded-full border",
        on ? "bg-green-50 text-green-700 border-green-200" : "bg-slate-50 text-slate-600 border-slate-200",
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
  const { blogid } = await params; // ✅ Next 15
  const data = await getVendor(blogid);

  // Allow flexible shapes (won’t break if your keys differ)
  const as = data.account_settings ?? {};
  const owner = as.owner ?? as.contact ?? as.profile ?? {};
  const business = as.business ?? as.company ?? as.shop ?? {};

  const sub = data.subscription ?? as.subscription ?? {};

  return (
    <div className="p-6 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm text-slate-400">Vendor</div>
          <h1 className="text-2xl font-semibold text-white">
            {data.site?.name ?? `Blog ${data.blogid}`}
          </h1>
          <div className="text-xs text-slate-300 break-all">{data.site?.url}</div>
        </div>

        <div className="flex gap-2">
          {data.links?.store ? (
            <a
              href={data.links.store}
              target="_blank"
              className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm text-white hover:bg-white/20 transition"
            >
              Open Store
            </a>
          ) : null}
          {data.links?.dashboard ? (
            <a
              href={data.links.dashboard}
              target="_blank"
              className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm text-white hover:bg-white/20 transition"
            >
              Open Dashboard
            </a>
          ) : null}
          <Link
            href="/master/vendors"
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white hover:bg-white/10 transition"
          >
            Back
          </Link>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Profile / Business */}
        <div className="rounded-2xl border border-white/10 bg-white p-4 shadow-sm lg:col-span-2">
          <div className="font-semibold mb-3 text-slate-900">Profile & Business</div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <div className="text-xs text-slate-500">Owner</div>
              <div className="text-sm text-slate-900">{owner.name ?? "-"}</div>
              <div className="text-xs text-slate-600">{owner.mobile ?? "-"}</div>
              <div className="text-xs text-slate-600 break-all">{owner.email ?? "-"}</div>
            </div>

            <div>
              <div className="text-xs text-slate-500">Business</div>
              <div className="text-sm text-slate-900">{business.name ?? "-"}</div>
              <div className="text-xs text-slate-600">{business.category ?? "-"}</div>
              <div className="text-xs text-slate-600">
                {(business.city ?? "") + (business.state ? `, ${business.state}` : "") || "-"}
              </div>
            </div>
          </div>
        </div>

        {/* Subscription */}
        <div className="rounded-2xl border border-white/10 bg-white p-4 shadow-sm">
          <div className="font-semibold mb-3 text-slate-900">Subscription</div>

          <div className="text-sm text-slate-900 space-y-2">
            <div className="flex justify-between gap-3">
              <span className="text-slate-500">Plan</span>
              <span>{sub.plan ?? "-"}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-slate-500">Period</span>
              <span>{sub.period ?? "-"}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-slate-500">Status</span>
              <span>{sub.status ?? "-"}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-slate-500">Last billed</span>
              <span>{sub.last_billed_at ?? "-"}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-slate-500">Next renewal</span>
              <span>{sub.next_renewal_at ?? "-"}</span>
            </div>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="rounded-2xl border border-white/10 bg-white p-4 shadow-sm">
          <div className="font-semibold mb-3 text-slate-900">Payment Methods</div>

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

        {/* Shipping */}
        <div className="rounded-2xl border border-white/10 bg-white p-4 shadow-sm">
          <div className="font-semibold mb-3 text-slate-900">Shipping</div>
          <div className="text-sm text-slate-900">
            Provider:{" "}
            <span className="font-medium">
              {data.shipping?.provider === "shift" ? "Shift" : "Self Shipping"}
            </span>
          </div>
        </div>

        {/* Counts (visible + correct orders) */}
        <div className="rounded-2xl border border-white/10 bg-white p-4 shadow-sm">
          <div className="font-semibold mb-3 text-slate-900">Counts</div>

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

        {/* Tickets */}
        <div className="rounded-2xl border border-white/10 bg-white p-4 shadow-sm lg:col-span-3">
          <div className="font-semibold mb-3 text-slate-900">Support Tickets (Summary)</div>
          <div className="flex flex-wrap gap-3 text-sm text-slate-900">
            <span className="rounded-full border px-3 py-1">Open: {data.tickets?.open ?? 0}</span>
            <span className="rounded-full border px-3 py-1">Pending: {data.tickets?.pending ?? 0}</span>
            <span className="rounded-full border px-3 py-1">Closed: {data.tickets?.closed ?? 0}</span>
            <span className="text-xs text-slate-500 self-center">
              (Tickets wiring comes next.)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
