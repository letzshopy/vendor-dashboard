"use client";

export default function ShippingTab() {
  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-2xl font-semibold">Shipping</h1>

      <div className="mt-3 rounded border bg-amber-50 border-amber-200 p-3 text-amber-900 text-sm">
        We’re redesigning Shipping. The old module has been removed.
        You’ll soon configure:
        <ul className="list-disc ml-6 mt-2">
          <li>Zones (e.g., South India, North India)</li>
          <li>Methods per zone:
            <ul className="list-disc ml-6 mt-1">
              <li><b>Free Shipping</b></li>
              <li><b>Shipping Rate</b> (weight-based, common)</li>
              <li><b>Shipping Rate – &lt;Category Name&gt;</b> (category overrides)</li>
            </ul>
          </li>
        </ul>
      </div>

      <div className="mt-4 text-sm text-slate-600 space-y-2">
        <p>
          Products will use human-friendly shipping classes:
          <code className="ml-1 px-2 py-0.5 bg-slate-100 rounded">free-shipping</code>,
          <code className="ml-1 px-2 py-0.5 bg-slate-100 rounded">shipping-rate</code>,
          <code className="ml-1 px-2 py-0.5 bg-slate-100 rounded">shipping-rate-&lt;category-slug&gt;</code>.
        </p>
        <p>
          Cart totals will support mixed carts by splitting packages per shipping class
          and summing the results (e.g., <b>0 + 50</b>, <b>50 + 65</b>).
        </p>
      </div>
    </div>
  );
}
