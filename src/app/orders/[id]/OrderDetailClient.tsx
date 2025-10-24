"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ORDER_STATUSES,
  STATUS_LABEL,
  WCLineItem,
  WCOrder,
  statusPillClass,
} from "@/lib/order-utils";
import { formatOrderDate } from "@/lib/datetime";

// API helpers
async function getOrder(id: string | number): Promise<WCOrder> {
  const res = await fetch(`/api/orders/${id}/view`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load order");
  return res.json();
}
async function updateOrder(id: number, payload: Partial<WCOrder>) {
  const res = await fetch(`/api/orders/${id}/update`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Update failed");
  return res.json();
}
async function refundOrder(id: number, payload: any) {
  const res = await fetch(`/api/orders/${id}/refund`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Refund failed");
  return res.json();
}

type Note = { id: number; note: string; customer_note: boolean; date_created_gmt?: string };
async function getNotes(id: number): Promise<Note[]> {
  const r = await fetch(`/api/orders/${id}/notes`, { cache: "no-store" });
  if (!r.ok) throw new Error("Failed to load notes");
  return r.json();
}
async function addNote(id: number, note: string, customer_note: boolean) {
  const r = await fetch(`/api/orders/${id}/notes`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ note, customer_note }),
  });
  if (!r.ok) throw new Error((await r.json().catch(()=>({}))).error || "Failed to add note");
  return r.json();
}

export default function OrderDetailClient({ id }: { id: number }) {
  const [order, setOrder] = useState<WCOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>("");

  const [notes, setNotes] = useState<Note[]>([]);
  const [noteText, setNoteText] = useState("");
  const [notifyCustomer, setNotifyCustomer] = useState(false);

  const [bill, setBill] = useState<WCOrder["billing"]>({});
  const [ship, setShip] = useState<WCOrder["shipping"]>({});
  const [editBilling, setEditBilling] = useState(false);
  const [editShipping, setEditShipping] = useState(false);

  useEffect(() => {
    Promise.all([getOrder(id), getNotes(id)])
      .then(([o, n]) => {
        setOrder(o);
        setBill(o.billing || {});
        setShip(o.shipping || {});
        setNotes(n);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  const totalQty = useMemo(
    () => (order?.line_items || []).reduce((a, b) => a + (b.quantity || 0), 0),
    [order]
  );

  if (loading) return <div className="p-6">Loading…</div>;
  if (!order) return <div className="p-6 text-rose-600">{error || "Order not found"}</div>;

  function changeQty(lineId: number | undefined, qty: number) {
    if (!order) return;
    const items = (order.line_items || []).map((li) =>
      li.id === lineId ? { ...li, quantity: qty } : li
    );
    setOrder({ ...order, line_items: items });
  }

  async function handleStatusUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const status = String(new FormData(e.currentTarget).get("status"));
    setSaving(true);
    try { setOrder(await updateOrder(order.id, { status })); }
    catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  }

  async function handleSaveItems() {
    setSaving(true);
    try {
      const line_items = (order!.line_items || []).map((li) => ({ id: li.id, quantity: li.quantity }));
      setOrder(await updateOrder(order!.id, { line_items }));
    } catch (e: any) { setError(e.message); } finally { setSaving(false); }
  }

  async function handleRefundOne(li: WCLineItem) {
    setSaving(true);
    try {
      await refundOrder(order!.id, {
        amount: li.total || "0",
        reason: "Line item refund",
        line_items: [{ id: li.id, quantity: li.quantity, refund_total: li.total }],
      });
      setOrder(await getOrder(order!.id));
    } catch (e: any) { setError(e.message); } finally { setSaving(false); }
  }

  async function saveAddresses(which: "billing" | "shipping") {
    setSaving(true);
    try {
      const payload: any = {}; if (which === "billing") payload.billing = bill; else payload.shipping = ship;
      setOrder(await updateOrder(order!.id, payload));
      if (which === "billing") setEditBilling(false); else setEditShipping(false);
    } catch (e: any) { setError(e.message); } finally { setSaving(false); }
  }

  async function handleAddNote(e: React.FormEvent) {
    e.preventDefault();
    if (!noteText.trim()) return;
    setSaving(true);
    try {
      await addNote(order!.id, noteText, notifyCustomer);
      setNotes(await getNotes(order!.id));
      setNoteText(""); setNotifyCustomer(false);
    } catch (e: any) { setError(e.message); } finally { setSaving(false); }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Order #{order.number || order.id}</h1>
          <div className="text-sm text-slate-500">
            {formatOrderDate(order.date_created_gmt)}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={statusPillClass(order.status)}>{STATUS_LABEL[order.status] || order.status}</span>
          <form onSubmit={handleStatusUpdate} className="flex items-center gap-2">
            <select name="status" defaultValue={order.status} className="border rounded px-2 py-1">
              {ORDER_STATUSES.map((s) => (<option key={s} value={s}>{STATUS_LABEL[s] || s}</option>))}
            </select>
            <button disabled={saving} className="px-3 py-1 border rounded bg-black text-white disabled:opacity-50">
              Update
            </button>
          </form>
        </div>
      </header>

      {/* Addresses (view-first with ✏️ edit toggle) */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card title={
          <div className="flex items-center justify-between">
            <span>Billing</span>
            <button onClick={() => setEditBilling((v)=>!v)} className="text-sm underline">✏️ {editBilling ? "Close" : "Edit"}</button>
          </div>
        }>
          {editBilling ? (
            <>
              <AddrEdit data={bill} onChange={setBill} />
              <div className="text-sm text-slate-500 mt-2">Payment: {order.payment_method_title || "-"}</div>
              <div className="mt-3">
                <button onClick={() => saveAddresses("billing")} disabled={saving} className="px-3 py-1 border rounded">
                  Save Billing
                </button>
              </div>
            </>
          ) : (
            <>
              <AddrView data={order.billing} />
              <div className="text-sm text-slate-500 mt-2">Payment: {order.payment_method_title || "-"}</div>
            </>
          )}
        </Card>

        <Card title={
          <div className="flex items-center justify-between">
            <span>Shipping</span>
            <button onClick={() => setEditShipping((v)=>!v)} className="text-sm underline">✏️ {editShipping ? "Close" : "Edit"}</button>
          </div>
        }>
          {editShipping ? (
            <>
              <AddrEdit data={ship} onChange={setShip} />
              <div className="mt-3">
                <button onClick={() => saveAddresses("shipping")} disabled={saving} className="px-3 py-1 border rounded">
                  Save Shipping
                </button>
              </div>
            </>
          ) : (
            <AddrView data={order.shipping} />
          )}
        </Card>
      </section>

      {/* Items */}
      <section className="bg-white rounded-lg shadow overflow-x-auto">
        <div className="p-3 flex items-center justify-between">
          <h2 className="font-medium">Items ({totalQty})</h2>
          <div className="flex gap-2">
            <button onClick={() => window.print()} className="px-3 py-1 border rounded" title="Print">Print</button>
            <button onClick={handleSaveItems} disabled={saving} className="px-3 py-1 border rounded bg-black text-white disabled:opacity-50">
              Save Items
            </button>
          </div>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="p-2">Item</th><th className="p-2">SKU</th><th className="p-2">Qty</th>
              <th className="p-2">Price</th><th className="p-2">Line Total</th><th className="p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(order.line_items || []).map((li) => (
              <tr key={li.id} className="border-t">
                <td className="p-2">{li.name}</td>
                <td className="p-2">{li.sku || "-"}</td>
                <td className="p-2 w-24">
                  <input type="number" className="border rounded px-2 py-1 w-24" min={0}
                         value={li.quantity} onChange={(e) => changeQty(li.id, Number(e.target.value))}/>
                </td>
                <td className="p-2">{li.price ? `₹${li.price}` : "-"}</td>
                <td className="p-2">{li.total ? `₹${li.total}` : "-"}</td>
                <td className="p-2">
                  <button onClick={() => handleRefundOne(li)} className="px-2 py-1 border rounded text-rose-600" title="Refund this item">
                    Refund
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Totals */}
      <section className="flex justify-end">
        <div className="bg-white rounded-lg shadow p-4 w-full md:w-96">
          <h3 className="font-semibold mb-2">Totals</h3>
          <div className="flex justify-between text-sm"><span>Grand Total</span><span className="font-semibold">₹{order.total}</span></div>
        </div>
      </section>

      {/* Notes */}
      <section className="bg-white rounded-lg shadow p-4 space-y-4">
        <h3 className="font-semibold">Timeline & Notes</h3>
        <form onSubmit={(e)=>{e.preventDefault(); if(!noteText.trim()) return; handleAddNote(e);}} className="flex flex-col gap-2">
          <textarea className="border rounded p-2 min-h-[80px]" placeholder="Write an internal note or a customer-visible note…"
                    value={noteText} onChange={(e) => setNoteText(e.target.value)} />
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={notifyCustomer} onChange={(e) => setNotifyCustomer(e.currentTarget.checked)} />
            Send to customer (email)
          </label>
          <div><button disabled={saving || !noteText.trim()} className="px-3 py-1 border rounded bg-black text-white disabled:opacity-50">Add note</button></div>
        </form>
        <div className="divide-y">
          {notes.length === 0 && <div className="text-sm text-slate-500">No notes yet.</div>}
          {notes.map((n) => (
            <div key={n.id} className="py-2">
              <div className="text-sm whitespace-pre-wrap">{n.note}</div>
              <div className="text-xs text-slate-500 mt-1">
                {(n.customer_note ? "Customer note" : "Internal note")} • {formatOrderDate(n.date_created_gmt)}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

// UI bits
function Card({ title, children }: { title: React.ReactNode; children: React.ReactNode }) {
  return <div className="bg-white rounded-lg shadow p-4"><h3 className="font-semibold mb-2">{title}</h3>{children}</div>;
}
function Text({ label, value, onChange }: { label: string; value?: string; onChange: (v: string) => void }) {
  return (
    <label className="text-sm block mb-2">
      <span className="block text-slate-600 mb-1">{label}</span>
      <input className="border rounded px-2 py-1 w-full" value={value || ""} onChange={(e) => onChange(e.currentTarget.value)} />
    </label>
  );
}
function AddrView({ data }: { data: WCOrder["billing"] | undefined }) {
  if (!data) return <div className="text-sm text-slate-400">-</div>;
  return (
    <div className="text-sm">
      <div className="font-medium">{(data.first_name || "") + " " + (data.last_name || "")}</div>
      <div>{data.address_1}</div>
      {data.address_2 ? <div>{data.address_2}</div> : null}
      <div>{data.city}, {data.state} {data.postcode}</div>
      <div className="text-slate-500">{data.phone}</div>
      <div className="text-slate-500">{data.email}</div>
    </div>
  );
}
function AddrEdit({ data, onChange }: { data: WCOrder["billing"] | undefined; onChange: (d: WCOrder["billing"]) => void; }) {
  const d = data || {};
  return (
    <div className="text-sm grid grid-cols-2 gap-2">
      <Text label="First name" value={d.first_name} onChange={(v) => onChange({ ...d, first_name: v })} />
      <Text label="Last name" value={d.last_name} onChange={(v) => onChange({ ...d, last_name: v })} />
      <Text label="Phone" value={d.phone} onChange={(v) => onChange({ ...d, phone: v })} />
      <Text label="Email" value={d.email} onChange={(v) => onChange({ ...d, email: v })} />
      <div className="col-span-2"><Text label="Address 1" value={d.address_1} onChange={(v) => onChange({ ...d, address_1: v })} /></div>
      <div className="col-span-2"><Text label="Address 2" value={d.address_2} onChange={(v) => onChange({ ...d, address_2: v })} /></div>
      <Text label="City" value={d.city} onChange={(v) => onChange({ ...d, city: v })} />
      <Text label="State" value={d.state} onChange={(v) => onChange({ ...d, state: v })} />
      <Text label="Postcode" value={d.postcode} onChange={(v) => onChange({ ...d, postcode: v })} />
    </div>
  );
}
