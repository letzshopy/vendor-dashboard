import { woo } from "@/lib/woo";
import { WCOrder } from "@/lib/order-utils";
import PrintClient from "./PrintClient";
import { getBaseUrl } from "@/lib/absolute-url"; // NEW

const LOGO_URL = process.env.NEXT_PUBLIC_PACKSLIP_LOGO || "";

/** Fetch orders 1-by-1 */
async function getOrders(ids: number[]): Promise<WCOrder[]> {
  const out: WCOrder[] = [];
  for (const id of ids) {
    const { data } = await woo.get<WCOrder>(`/orders/${id}`);
    out.push(data);
  }
  return out;
}

function pickAddress(o: WCOrder) {
  const a =
    o.shipping && (o.shipping.first_name || o.shipping.address_1)
      ? o.shipping
      : (o.billing || {});
  const name = [a?.first_name, a?.last_name].filter(Boolean).join(" ");
  const lines = [
    a?.address_1,
    a?.address_2,
    [a?.city, a?.state, a?.postcode].filter(Boolean).join(", "),
  ].filter(Boolean) as string[];
  const phone = a?.phone || o.billing?.phone || "";
  return { name, lines, phone };
}

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function PackSlipsPage({ searchParams }: Props) {
  const sp = (await searchParams) ?? {};

  const ids = String(sp?.ids || "")
    .split(",")
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => Number.isFinite(n));

  let orders: WCOrder[] = [];
  let error: string | null = null;

  // NEW: return-address settings
  let returnAddress = "";
  let showReturn = false;

  try {
    if (!ids.length) {
      error = "No order IDs provided.";
    } else {
      const base =
        (process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "") as string) ||
        getBaseUrl();

      // Load orders + settings in parallel
      const [ordersResult, settingsRes] = await Promise.all([
        getOrders(ids),
        fetch(`${base}/api/settings/general`, { cache: "no-store" }).catch(
          () => null
        ),
      ]);

      orders = ordersResult;

      if (settingsRes && settingsRes.ok) {
        const text = await settingsRes.text().catch(() => "");
        if (text) {
          const j = JSON.parse(text);
          const prod = j?.products || j?.general?.products || {};
          const addr = (prod.packslipReturnAddress || "").trim();
          const flag = !!prod.packslipShowReturn;
          if (addr && flag) {
            returnAddress = addr;
            showReturn = true;
          }
        }
      }
    }
  } catch (e: any) {
    error = e?.message || "Failed to load orders.";
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <PrintClient />

      {/* PORTRAIT, 2-per-sheet stacked, safer right padding, bigger buffer to keep footer on same page */}
      <style>{`
        :root{
          /* A4 portrait */
          --page-w: 210mm;
          --page-h: 297mm;

          /* Outer printer margin (wider to avoid right-edge clipping) */
          --outer-margin: 12mm;

          /* Sheet padding & vertical gap between the 2 slips */
          --pad: 8mm;
          --gap: 8mm;

          /* Inside each slip */
          --slip-pad: 8mm;

          /* Generous buffer to avoid any rounding overflow */
          --big-buffer: 22mm;

          --border: 1px dashed #CBD5E1;
          --text: #0f172a;
          --muted: #64748B;
        }

        @media print {
          @page { size: A4 portrait; margin: var(--outer-margin); }
          .no-print { display: none !important; }
          header, nav { display: none !important; }
          body { margin: 0; }
        }

        .sheet {
          width: var(--page-w);
          max-width: 100%;
          margin: 0 auto;
          padding: var(--pad);
          box-sizing: border-box;
        }

        /* Two rows, fixed row-height with buffer so nothing spills */
        .grid {
          display: grid;
          grid-template-columns: 1fr;
          grid-auto-rows: calc(
            (var(--page-h) - (var(--pad) * 2) - var(--gap) - var(--big-buffer)) / 2
          );
          row-gap: var(--gap);
          page-break-after: always;
        }

        .slip {
          border: var(--border);
          background: #fff;
          padding: var(--slip-pad);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          height: 100%;
          box-sizing: border-box;
          overflow: hidden; /* absolutely never spill to the next page */
        }

        /* Header */
        .hdr {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          border-bottom: 1px solid #E5E7EB;
          padding-bottom: 6px;
          margin-bottom: 6px;
          padding-right: 8mm; /* SAFE RIGHT PADDING for order # */
        }
        .logo { height: 38px; object-fit: contain; }
        .title { font-size: 18px; font-weight: 800; color: var(--text); }
        .meta { font-size: 14px; color: #374151; white-space: nowrap; }

        .addr { font-size: 15px; line-height: 1.34; margin-top: 8px; color: var(--text); }
        .addr div { word-break: break-word; }

        .items { margin-top: 8px; font-size: 14px; color: var(--text); }
        .items table { width: 100%; border-collapse: collapse; table-layout: fixed; }
        .items th, .items td { padding: 5px 0; text-align: left; border-bottom: 1px dotted #E5E7EB; vertical-align: top; }
        .items th.qty, .items td.qty { width: 52px; text-align: right; }
        .sku { color: var(--muted); }

        /* NEW: return / from address block */
        .return-addr {
          margin-top: 6px;
          font-size: 11px;
          color: var(--muted);
          white-space: pre-line;
        }

        /* No extra vertical gap before footer; tiny separator only */
        .footer-wrap {
          margin-top: 0;
        }

        .footer {
          margin-top: 5px;
          padding-top: 5px;
          border-top: 1px solid #E5E7EB;
          font-size: 13px;
          color: var(--muted);
          display: flex;
          justify-content: space-between;
        }
      `}</style>

      <div className="no-print p-3 text-sm text-slate-600">
        Pack Slips (A4 portrait) — 2 per page (top/bottom). Extra buffer to keep the
        footer on the same page; added safe right padding for the order number.
      </div>

      {error ? (
        <div className="sheet">
          <div className="bg-white rounded border p-6 text-slate-700">
            {error}
          </div>
        </div>
      ) : (
        <>
          {Array.from({ length: Math.ceil(orders.length / 2) }).map(
            (_, sheetIdx) => {
              const slice = orders.slice(sheetIdx * 2, sheetIdx * 2 + 2);
              return (
                <div className="sheet" key={`sheet-${sheetIdx}`}>
                  <div className="grid">
                    {slice.map((o) => {
                      const a = pickAddress(o);
                      return (
                        <div className="slip" key={o.id}>
                          <div>
                            <div className="hdr">
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "10px",
                                }}
                              >
                                {LOGO_URL ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    className="logo"
                                    src={LOGO_URL}
                                    alt="Logo"
                                  />
                                ) : (
                                  <div className="title">Pack Slip</div>
                                )}
                              </div>
                              <div className="meta">
                                <b>Order:</b> #{o.number || o.id}
                              </div>
                            </div>

                            <div className="addr">
                              <div>
                                <b>Ship To:</b> {a.name || "-"}
                              </div>
                              {a.lines.map((ln, i) => (
                                <div key={i}>{ln}</div>
                              ))}
                              {a.phone ? (
                                <div>
                                  <b>Mobile:</b> {a.phone}
                                </div>
                              ) : null}
                            </div>

                            <div className="items">
                              <table>
                                <thead>
                                  <tr>
                                    <th>Item</th>
                                    <th className="qty">Qty</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {(o.line_items || []).map((li) => (
                                    <tr key={li.id}>
                                      <td>
                                        <div style={{ wordBreak: "break-word" }}>
                                          {li.name}
                                          {li.sku ? (
                                            <span className="sku">
                                              {" "}
                                              ({li.sku})
                                            </span>
                                          ) : null}
                                        </div>
                                      </td>
                                      <td className="qty">{li.quantity}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>

                          {/* Bottom block: optional return address + footer */}
                          <div className="footer-wrap">
                            {showReturn && returnAddress && (
                              <div className="return-addr">
                                <span className="font-semibold">
                                  From / Return Address:
                                </span>{" "}
                                {returnAddress}
                              </div>
                            )}
                            <div className="footer">
                              <div>
                                Payment: {o.payment_method_title || "-"}
                              </div>
                              <div>Total: ₹{o.total}</div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {slice.length < 2 ? <div className="slip" /> : null}
                  </div>
                </div>
              );
            }
          )}
        </>
      )}
    </div>
  );
}