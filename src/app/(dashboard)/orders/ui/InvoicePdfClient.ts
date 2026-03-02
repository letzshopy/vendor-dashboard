"use client";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/** -----------------------------
 * Settings & data types
 * ----------------------------- */
type Address = {
  first_name?: string;
  last_name?: string;
  company?: string;
  address_1?: string;
  address_2?: string;
  city?: string;
  state?: string;
  postcode?: string;
  country?: string;
  email?: string;
  phone?: string;
};

type OrderDetail = {
  id: number;
  number?: string;
  date_created: string;
  status: string;
  currency?: string;
  billing: Address;
  shipping: Address;
  payment_method_title?: string;

  line_items: Array<{
    id: number;
    name: string;
    quantity: number;
    price: number;
    subtotal: string;
    total: string;
    sku?: string;
  }>;

  shipping_total?: string;
  discount_total?: string;
  total?: string;
  total_tax?: string;
};

type ShippingSettings = {
  logoUrl?: string;          // vendor/site logo URL
  businessAddress?: string;  // multi-line vendor business address
};

/** -----------------------------
 * Helpers
 * ----------------------------- */

// NOTE: jspdf built-in font lacks "₹" -> show "Rs" to avoid glyph issues.
function fmtINR(n: number | string | undefined) {
  const v = Number(n || 0);
  return `Rs ${v.toFixed(2)}`;
}

function addrToLines(a: Address): string[] {
  const lines: string[] = [];
  const name = [a.first_name, a.last_name].filter(Boolean).join(" ").trim();
  if (name) lines.push(name);
  if (a.company) lines.push(a.company);
  if (a.address_1) lines.push(a.address_1);
  if (a.address_2) lines.push(a.address_2);
  const cityLine = [a.city, a.state, a.postcode].filter(Boolean).join(", ");
  if (cityLine) lines.push(cityLine);
  if (a.country) lines.push(a.country);
  if (a.phone) lines.push(`Mob: ${a.phone}`);
  if (a.email) lines.push(a.email);
  return lines;
}

async function fetchOrder(id: number): Promise<OrderDetail> {
  const res = await fetch(`/api/orders/${id}/view`, { cache: "no-store" });
  if (!res.ok) throw new Error("Order fetch failed");
  return await res.json();
}

async function getSettings(): Promise<ShippingSettings> {
  try {
    const res = await fetch("/api/settings/shipping", { cache: "no-store" });
    if (!res.ok) return {};
    const json = await res.json();
    return {
      logoUrl: json?.logoUrl || json?.logo || "",
      businessAddress: json?.businessAddress || json?.returnAddress || json?.vendorAddress || "",
    };
  } catch {
    return {};
  }
}

async function getTaxRate(): Promise<number> {
  try {
    const res = await fetch("/api/settings/tax", { cache: "no-store" });
    if (!res.ok) return 0;
    const j = await res.json();
    const rate = Number(j?.rate);
    return Number.isFinite(rate) ? rate : 0;
  } catch {
    return 0;
  }
}

async function loadImageAsBase64(url: string): Promise<{ dataUrl: string; mime: string } | null> {
  try {
    const b = await fetch(url).then(r => r.blob());
    const buf = await b.arrayBuffer();
    const mime = b.type || "image/png";
    const base64 = `data:${mime};base64,${Buffer.from(buf).toString("base64")}`;
    return { dataUrl: base64, mime };
  } catch {
    return null;
  }
}

/** -----------------------------
 * PDF drawing
 * ----------------------------- */

async function drawInvoice(
  doc: jsPDF,
  order: OrderDetail,
  pageIndex: number,
  settings: ShippingSettings,
  taxRatePct: number
) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const left = margin;
  const right = pageWidth - margin;

  if (pageIndex > 1) doc.addPage();

  let y = 16;

  // ====== Header row ======
  // Left: Logo (if available)
  const logoBoxW = 42; // width reserved for logo
  const logoBoxH = 14;
  if (settings.logoUrl) {
    const img = await loadImageAsBase64(settings.logoUrl);
    if (img) {
      doc.addImage(img.dataUrl, "PNG", left, y - 4, logoBoxW, logoBoxH, undefined, "FAST");
    }
  }

  // Center: "INVOICE" title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  const title = "INVOICE";
  const titleW = doc.getTextWidth(title);
  doc.text(title, pageWidth / 2, y + 6, { align: "center" });

  // Right: vendor business address (wrapped, right-aligned)
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  if (settings.businessAddress) {
    const addrLines = settings.businessAddress.split(/\r?\n/).filter(Boolean);
    const maxRightColWidth = 70;
    const wrapped: string[] = [];
    addrLines.forEach(line => {
      const parts = doc.splitTextToSize(line, maxRightColWidth);
      wrapped.push(...parts);
    });
    // draw right-aligned block
    wrapped.forEach((ln, i) => {
      doc.text(ln, right, y + i * 5, { align: "right" });
    });
  }

  // order meta (top-right below address)
  const metaStartY = y + (settings.businessAddress ? 5 * (settings.businessAddress.split(/\r?\n/).filter(Boolean).length) : 0) + 8;
  doc.setFontSize(10);
  doc.text(`Order: #${order.number || order.id}`, right, metaStartY, { align: "right" });
  doc.text(`Date: ${new Date(order.date_created).toLocaleString()}`, right, metaStartY + 6, { align: "right" });
  doc.text(`Status: ${order.status}`, right, metaStartY + 12, { align: "right" });

  // move Y below header content
  y = Math.max(y + logoBoxH + 6, metaStartY + 16);

  // ====== Billing / Shipping boxes ======
  const billX = left;
  const shipX = pageWidth / 2 + 5;

  doc.setFont("helvetica", "bold");
  doc.text("Billing address", billX, y);
  doc.text("Shipping address", shipX, y);

  doc.setFont("helvetica", "normal");
  const billLines = addrToLines(order.billing);
  const shipLines = addrToLines(order.shipping || order.billing);

  billLines.forEach((ln, i) => doc.text(ln, billX, y + 6 + i * 5));
  shipLines.forEach((ln, i) => doc.text(ln, shipX, y + 6 + i * 5));

  y += Math.max(6 + billLines.length * 5, 6 + shipLines.length * 5) + 6;

  // ====== Items table ======
  const items = order.line_items || [];
  const body = items.map((it) => [
    it.name,
    String(it.quantity),
    fmtINR(it.price),
    fmtINR(it.total),
  ]);

  autoTable(doc, {
    head: [["Item", "Qty", "Price", "Line total"]],
    body,
    startY: y,
    styles: { font: "helvetica", fontSize: 10, cellPadding: 2 },
    headStyles: { fillColor: [243, 244, 246], textColor: 0 },
    columnStyles: { 0: { cellWidth: 110 }, 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" } },
    theme: "grid",
    tableWidth: pageWidth - margin * 2,
    margin: { left: margin, right: margin },
  });

  const tbl = (doc as any).lastAutoTable;
  y = tbl.finalY + 6;

  // ====== Totals ======
  const subtotal = items.reduce((s, it) => s + Number(it.subtotal || it.total || 0), 0);
  const shipping = Number(order.shipping_total || 0);
  let taxTotal = Number(order.total_tax || 0);
  if (!taxTotal && taxRatePct > 0) taxTotal = +(subtotal * (taxRatePct / 100)).toFixed(2);
  const grand = Number(order.total || 0) || +(subtotal + shipping + taxTotal).toFixed(2);

  const totalRows = [
    ["Subtotal", fmtINR(subtotal)],
    ["Shipping", fmtINR(shipping)],
    ["Tax", fmtINR(taxTotal)],
    [{ content: "Grand Total", styles: { fontStyle: "bold" } } as any, { content: fmtINR(grand), styles: { fontStyle: "bold" } } as any],
  ];

  autoTable(doc, {
    body: totalRows,
    startY: y,
    styles: { font: "helvetica", fontSize: 10 },
    theme: "plain",
    tableWidth: 80,
    margin: { left: pageWidth - margin - 80 }, // right aligned box
    columnStyles: { 0: { cellWidth: 40 }, 1: { halign: "right", cellWidth: 40 } },
  });

  // ====== Footer small note (optional) ======
  if (settings.businessAddress) {
    doc.setFontSize(8);
    doc.setTextColor(120);
    const condensed = settings.businessAddress.split(/\r?\n/).filter(Boolean).join(" · ");
    doc.text(condensed, margin, 285);
    doc.setTextColor(0);
  }
}

async function buildPdfFor(ids: number[]) {
  const settings = await getSettings();
  const taxRate = await getTaxRate();

  const doc = new jsPDF({ unit: "mm", format: "a4" });

  for (let i = 0; i < ids.length; i++) {
    const od = await fetchOrder(ids[i]);
    await drawInvoice(doc, od, i + 1, settings, taxRate);
  }

  const name = ids.length === 1 ? `invoice-${ids[0]}.pdf` : `invoices-${ids[0]}-and-${ids.length - 1}-more.pdf`;
  doc.save(name);
}

const InvoicePdfClient = {
  async generateForOrders(ids: number[]) {
    if (!ids || ids.length === 0) return;
    await buildPdfFor(ids);
  },
};

export default InvoicePdfClient;
