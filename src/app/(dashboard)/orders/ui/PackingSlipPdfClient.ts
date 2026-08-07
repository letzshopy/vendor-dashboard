"use client";

import jsPDF from "jspdf";

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

type OrderLineItem = {
  id?: number;
  name?: string;
  sku?: string;
  quantity?: number;
  meta_data?: Array<{
    key?: string;
    display_key?: string;
    value?: unknown;
    display_value?: unknown;
  }>;
};

type OrderDetail = {
  id: number;
  number?: string;
  date_created?: string;
  billing?: Address;
  shipping?: Address;
  payment_method_title?: string;
  total?: string;
  line_items?: OrderLineItem[];
};

type VendorBrand = {
  name: string;
  address: string;
  phone: string;
  email: string;
  logoDataUrl: string;
};

const NAVY: [number, number, number] = [46, 63, 125];
const CORAL: [number, number, number] = [232, 93, 74];
const TEXT: [number, number, number] = [31, 41, 55];
const MUTED: [number, number, number] = [100, 116, 139];
const BORDER: [number, number, number] = [214, 220, 230];
const TABLE_HEAD: [number, number, number] = [244, 246, 250];

const PAGE_MARGIN = 10;
const SLOT_GAP = 7;
const SLOT_HEIGHT =
  (297 - PAGE_MARGIN * 2 - SLOT_GAP) / 2;
const SLOT_WIDTH = 210 - PAGE_MARGIN * 2;

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function formatDate(value?: string) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function pickShippingAddress(
  order: OrderDetail
): Address {
  const shipping = order.shipping || {};

  const hasShipping = Boolean(
    clean(shipping.first_name) ||
      clean(shipping.last_name) ||
      clean(shipping.address_1)
  );

  return hasShipping
    ? shipping
    : order.billing || {};
}

function addressLines(
  address: Address
): string[] {
  const lines: string[] = [];

  if (clean(address.company)) {
    lines.push(clean(address.company));
  }

  if (clean(address.address_1)) {
    lines.push(clean(address.address_1));
  }

  if (clean(address.address_2)) {
    lines.push(clean(address.address_2));
  }

  const cityLine = [
    clean(address.city),
    clean(address.state),
    clean(address.postcode),
  ]
    .filter(Boolean)
    .join(", ");

  if (cityLine) {
    lines.push(cityLine);
  }

  if (clean(address.country)) {
    lines.push(clean(address.country));
  }

  return lines;
}

function vendorLines(
  brand: VendorBrand
): string[] {
  const normalizeComparable = (
    value: string
  ) =>
    value
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");

  const lines = clean(brand.address)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (
    lines.length > 0 &&
    normalizeComparable(lines[0]) ===
      normalizeComparable(brand.name)
  ) {
    lines.shift();
  }

  const combined =
    lines.join(" ").toLowerCase();

  const addressDigits =
    combined.replace(/\D/g, "");

  const phoneDigits =
    clean(brand.phone).replace(/\D/g, "");

  if (
    brand.phone &&
    (
      !phoneDigits ||
      !addressDigits.includes(phoneDigits)
    )
  ) {
    lines.push(`Mobile: ${brand.phone}`);
  }

  if (
    brand.email &&
    !combined.includes(
      brand.email.toLowerCase()
    )
  ) {
    lines.push(brand.email);
  }

  return lines;
}

function scalarMetaValue(
  value: unknown
) {
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return clean(value);
  }

  return "";
}

function variationSummary(
  item: OrderLineItem
) {
  return (item.meta_data || [])
    .filter((meta) => {
      const key = clean(meta.key);

      return key && !key.startsWith("_");
    })
    .map((meta) => {
      const key = clean(
        meta.display_key || meta.key
      );

      const value = scalarMetaValue(
        meta.display_value ?? meta.value
      );

      if (!key || !value) {
        return "";
      }

      return `${key}: ${value}`;
    })
    .filter(Boolean)
    .slice(0, 4)
    .join(" | ");
}

async function fetchOrder(
  id: number
): Promise<OrderDetail> {
  const response = await fetch(
    `/api/orders/${id}/view`,
    { cache: "no-store" }
  );

  if (!response.ok) {
    throw new Error(
      `Order #${id} could not be loaded.`
    );
  }

  return await response.json();
}

async function readJson(
  url: string
) {
  try {
    const response = await fetch(
      url,
      { cache: "no-store" }
    );

    if (!response.ok) {
      return {};
    }

    return await response.json();
  } catch {
    return {};
  }
}

async function blobToPngDataUrl(
  blob: Blob
): Promise<string> {
  const objectUrl =
    URL.createObjectURL(blob);

  try {
    const image =
      await new Promise<HTMLImageElement>(
        (resolve, reject) => {
          const img = new Image();

          img.onload = () => resolve(img);
          img.onerror = () =>
            reject(
              new Error(
                "Store logo could not be decoded."
              )
            );

          img.src = objectUrl;
        }
      );

    const sourceWidth =
      image.naturalWidth || image.width;

    const sourceHeight =
      image.naturalHeight || image.height;

    if (
      sourceWidth <= 0 ||
      sourceHeight <= 0
    ) {
      return "";
    }

    const maxSide = 1200;
    const scale = Math.min(
      1,
      maxSide /
        Math.max(
          sourceWidth,
          sourceHeight
        )
    );

    const canvas =
      document.createElement("canvas");

    canvas.width = Math.max(
      1,
      Math.round(sourceWidth * scale)
    );

    canvas.height = Math.max(
      1,
      Math.round(sourceHeight * scale)
    );

    const context =
      canvas.getContext("2d");

    if (!context) {
      return "";
    }

    context.clearRect(
      0,
      0,
      canvas.width,
      canvas.height
    );

    context.drawImage(
      image,
      0,
      0,
      canvas.width,
      canvas.height
    );

    return canvas.toDataURL(
      "image/png"
    );
  } catch {
    return "";
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function loadProfileLogo() {
  try {
    const response = await fetch(
      "/api/settings/profile/logo",
      { cache: "no-store" }
    );

    if (!response.ok) {
      return "";
    }

    const blob =
      await response.blob();

    return await blobToPngDataUrl(
      blob
    );
  } catch {
    return "";
  }
}

async function getVendorBrand(
  fallbackStoreName: string
): Promise<VendorBrand> {
  const [profileJson, generalJson, logoDataUrl] =
    await Promise.all([
      readJson("/api/settings/profile"),
      readJson("/api/settings/general"),
      loadProfileLogo(),
    ]);

  const business =
    profileJson?.business || {};

  const products =
    generalJson?.products ||
    generalJson?.general?.products ||
    {};

  const customReturnAddress =
    clean(
      products.packslipReturnAddress
    );

  const useCustomReturnAddress =
    Boolean(
      products.packslipShowReturn
    ) &&
    Boolean(customReturnAddress);

  return {
    name:
      clean(business.name) ||
      clean(fallbackStoreName) ||
      "Your Store",
    address:
      useCustomReturnAddress
        ? customReturnAddress
        : clean(business.address),
    phone: clean(business.phone),
    email: clean(business.email),
    logoDataUrl,
  };
}

function drawWrappedLines(
  doc: jsPDF,
  lines: string[],
  x: number,
  y: number,
  width: number,
  maxLines: number,
  lineHeight = 4
) {
  const wrapped: string[] = [];

  for (const line of lines) {
    wrapped.push(
      ...(
        doc.splitTextToSize(
          line,
          width
        ) as string[]
      )
    );
  }

  wrapped
    .slice(0, maxLines)
    .forEach(
      (line, index) => {
        doc.text(
          line,
          x,
          y + index * lineHeight
        );
      }
    );
}

function drawLogo(
  doc: jsPDF,
  brand: VendorBrand,
  x: number,
  y: number
) {
  if (!brand.logoDataUrl) {
    doc.setFont(
      "helvetica",
      "bold"
    );

    doc.setFontSize(11);
    doc.setTextColor(...NAVY);

    doc.text(
      brand.name,
      x,
      y + 7
    );

    return;
  }

  try {
    const properties =
      doc.getImageProperties(
        brand.logoDataUrl
      );

    const maxWidth = 34;
    const maxHeight = 11;

    const ratio =
      properties.width /
      properties.height;

    let width = maxWidth;
    let height = width / ratio;

    if (height > maxHeight) {
      height = maxHeight;
      width = height * ratio;
    }

    doc.addImage(
      brand.logoDataUrl,
      "PNG",
      x,
      y,
      width,
      height,
      undefined,
      "FAST"
    );
  } catch {
    doc.setFont(
      "helvetica",
      "bold"
    );

    doc.setFontSize(11);
    doc.setTextColor(...NAVY);

    doc.text(
      brand.name,
      x,
      y + 7
    );
  }
}

function drawHeader(
  doc: jsPDF,
  order: OrderDetail,
  brand: VendorBrand,
  x: number,
  y: number,
  width: number,
  continued: boolean
) {
  drawLogo(
    doc,
    brand,
    x + 4,
    y + 4
  );

  doc.setFont(
    "helvetica",
    "bold"
  );

  doc.setFontSize(11);
  doc.setTextColor(...NAVY);

  doc.text(
    continued
      ? "PACKING SLIP - CONTINUED"
      : "PACKING SLIP",
    x + width - 4,
    y + 7,
    { align: "right" }
  );

  doc.setFontSize(8.5);

  doc.text(
    `Order #${order.number || order.id}`,
    x + width - 4,
    y + 12,
    { align: "right" }
  );

  doc.setFont(
    "helvetica",
    "normal"
  );

  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED);

  doc.text(
    formatDate(
      order.date_created
    ),
    x + width - 4,
    y + 16,
    { align: "right" }
  );

  doc.setDrawColor(...CORAL);
  doc.setLineWidth(0.7);

  doc.line(
    x,
    y + 20,
    x + width,
    y + 20
  );

  doc.setLineWidth(0.2);
}

function drawShippingAddress(
  doc: jsPDF,
  order: OrderDetail,
  x: number,
  y: number,
  width: number
) {
  const address =
    pickShippingAddress(order);

  const customerName =
    [
      clean(address.first_name),
      clean(address.last_name),
    ]
      .filter(Boolean)
      .join(" ") ||
    "Customer";

  const mobile =
    clean(address.phone) ||
    clean(order.billing?.phone);

  doc.setFont(
    "helvetica",
    "bold"
  );

  doc.setFontSize(7.5);
  doc.setTextColor(...NAVY);

  doc.text(
    "SHIPPING ADDRESS",
    x,
    y
  );

  doc.setFontSize(10.5);
  doc.setTextColor(...TEXT);

  doc.text(
    `To: ${customerName}`,
    x,
    y + 6
  );

  doc.setFont(
    "helvetica",
    "normal"
  );

  doc.setFontSize(8.5);

  drawWrappedLines(
    doc,
    addressLines(address),
    x,
    y + 11,
    width,
    4
  );

  if (mobile) {
    doc.setFont(
      "helvetica",
      "bold"
    );

    doc.setFontSize(8.5);
    doc.setTextColor(...TEXT);

    doc.text(
      `Mobile: ${mobile}`,
      x,
      y + 29
    );
  }

  doc.setDrawColor(...BORDER);

  doc.line(
    x,
    y + 34,
    x + width,
    y + 34
  );
}

function drawItems(
  doc: jsPDF,
  order: OrderDetail,
  startIndex: number,
  x: number,
  y: number,
  width: number,
  bottomY: number
) {
  const items =
    order.line_items || [];

  doc.setFillColor(
    ...TABLE_HEAD
  );

  doc.rect(
    x,
    y,
    width,
    7,
    "F"
  );

  doc.setFont(
    "helvetica",
    "bold"
  );

  doc.setFontSize(7.5);
  doc.setTextColor(...NAVY);

  doc.text(
    "ITEM",
    x + 3,
    y + 4.8
  );

  doc.text(
    "SKU",
    x + width - 48,
    y + 4.8
  );

  doc.text(
    "QTY",
    x + width - 3,
    y + 4.8,
    { align: "right" }
  );

  let cursorY = y + 9.5;

  if (!items.length) {
    doc.setFont(
      "helvetica",
      "normal"
    );

    doc.setFontSize(8);
    doc.setTextColor(...MUTED);

    doc.text(
      "No line items available.",
      x + 3,
      cursorY + 3
    );

    return {
      nextIndex: 0,
      hasMore: false,
    };
  }

  let index = startIndex;

  while (index < items.length) {
    const item = items[index];

    const name =
      clean(item.name) ||
      "Product";

    const variation =
      variationSummary(item);

    const nameLines =
      doc.splitTextToSize(
        name,
        width - 67
      ) as string[];

    const variationLines =
      variation
        ? (
            doc.splitTextToSize(
              variation,
              width - 67
            ) as string[]
          )
        : [];

    const rowHeight = Math.max(
      8.5,
      nameLines.length * 3.8 +
        (
          variationLines.length
            ? variationLines.length * 3.2 + 1
            : 0
        ) +
        2.5
    );

    if (
      cursorY + rowHeight >
        bottomY &&
      index > startIndex
    ) {
      break;
    }

    doc.setFont(
      "helvetica",
      "bold"
    );

    doc.setFontSize(8.3);
    doc.setTextColor(...TEXT);

    nameLines.forEach(
      (line, lineIndex) => {
        doc.text(
          line,
          x + 3,
          cursorY +
            3.5 +
            lineIndex * 3.8
        );
      }
    );

    if (variationLines.length) {
      doc.setFont(
        "helvetica",
        "normal"
      );

      doc.setFontSize(6.8);
      doc.setTextColor(...MUTED);

      const variationY =
        cursorY +
        4 +
        nameLines.length * 3.8;

      variationLines.forEach(
        (line, lineIndex) => {
          doc.text(
            line,
            x + 3,
            variationY +
              lineIndex * 3.2
          );
        }
      );
    }

    doc.setFont(
      "helvetica",
      "normal"
    );

    doc.setFontSize(8);
    doc.setTextColor(...TEXT);

    doc.text(
      clean(item.sku) || "-",
      x + width - 48,
      cursorY + 3.5
    );

    doc.setFont(
      "helvetica",
      "bold"
    );

    doc.text(
      String(
        Number(
          item.quantity || 0
        )
      ),
      x + width - 3,
      cursorY + 3.5,
      { align: "right" }
    );

    doc.setDrawColor(...BORDER);

    doc.line(
      x,
      cursorY + rowHeight,
      x + width,
      cursorY + rowHeight
    );

    cursorY += rowHeight;
    index += 1;
  }

  return {
    nextIndex: index,
    hasMore: index < items.length,
  };
}

function drawBottomArea(
  doc: jsPDF,
  order: OrderDetail,
  brand: VendorBrand,
  x: number,
  y: number,
  width: number,
  hasMore: boolean
) {
  doc.setDrawColor(...BORDER);

  doc.line(
    x,
    y,
    x + width,
    y
  );

  if (hasMore) {
    doc.setFont(
      "helvetica",
      "normal"
    );

    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);

    doc.text(
      "More items continue in the next packing-slip section.",
      x,
      y + 5
    );

    return;
  }

  doc.setFont(
    "helvetica",
    "normal"
  );

  doc.setFontSize(7.2);
  doc.setTextColor(...MUTED);

  doc.text(
    `Payment: ${
      clean(
        order.payment_method_title
      ) || "-"
    }`,
    x,
    y + 5
  );

  doc.text(
    `Order total: Rs ${Number(
      order.total || 0
    ).toFixed(2)}`,
    x + width,
    y + 5,
    { align: "right" }
  );

  doc.setFont(
    "helvetica",
    "bold"
  );

  doc.setFontSize(7.2);
  doc.setTextColor(...NAVY);

  doc.text(
    "FROM / RETURN ADDRESS",
    x,
    y + 11
  );

  doc.setFont(
    "helvetica",
    "bold"
  );

  doc.setFontSize(8.4);
  doc.setTextColor(...TEXT);

  doc.text(
    brand.name,
    x,
    y + 16
  );

  doc.setFont(
    "helvetica",
    "normal"
  );

  doc.setFontSize(7.2);
  doc.setTextColor(...MUTED);

  const lines =
    vendorLines(brand);

  drawWrappedLines(
    doc,
    lines.length
      ? lines
      : [
          "Business address not added in Store Profile.",
        ],
    x,
    y + 20,
    width,
    6,
    3.4
  );
}

function drawSlipSegment(
  doc: jsPDF,
  order: OrderDetail,
  brand: VendorBrand,
  startIndex: number,
  slotIndex: number,
  continued: boolean
) {
  const x = PAGE_MARGIN;

  const y =
    PAGE_MARGIN +
    slotIndex *
      (
        SLOT_HEIGHT +
        SLOT_GAP
      );

  doc.setDrawColor(...BORDER);

  doc.roundedRect(
    x,
    y,
    SLOT_WIDTH,
    SLOT_HEIGHT,
    2,
    2,
    "S"
  );

  drawHeader(
    doc,
    order,
    brand,
    x,
    y,
    SLOT_WIDTH,
    continued
  );

  drawShippingAddress(
    doc,
    order,
    x + 4,
    y + 27,
    SLOT_WIDTH - 8
  );

  const itemsY = y + 67;
  const bottomAreaY =
    y + SLOT_HEIGHT - 42;

  const result =
    drawItems(
      doc,
      order,
      startIndex,
      x + 4,
      itemsY,
      SLOT_WIDTH - 8,
      bottomAreaY - 3
    );

  drawBottomArea(
    doc,
    order,
    brand,
    x + 4,
    bottomAreaY,
    SLOT_WIDTH - 8,
    result.hasMore
  );

  return result;
}

function safeFileNamePart(
  value: string
) {
  return value.replace(
    /[^a-zA-Z0-9_-]+/g,
    "-"
  );
}

async function savePdf(
  doc: jsPDF,
  fileName: string
) {
  const blob =
    doc.output("blob");

  const url =
    URL.createObjectURL(blob);

  const anchor =
    document.createElement("a");

  anchor.href = url;
  anchor.download = fileName;
  anchor.rel = "noopener";
  anchor.style.display = "none";

  document.body.appendChild(
    anchor
  );

  anchor.click();
  anchor.remove();

  window.setTimeout(
    () => {
      URL.revokeObjectURL(url);
    },
    1500
  );
}

async function buildPdf(
  ids: number[],
  fallbackStoreName: string
) {
  const [brand, orders] =
    await Promise.all([
      getVendorBrand(
        fallbackStoreName
      ),
      Promise.all(
        ids.map(
          (id) =>
            fetchOrder(id)
        )
      ),
    ]);

  const doc = new jsPDF({
    unit: "mm",
    format: "a4",
    orientation: "portrait",
    compress: true,
  });

  let slotIndex = 0;

  for (const order of orders) {
    const items =
      order.line_items || [];

    let itemIndex = 0;
    let continued = false;
    let rendered = false;

    do {
      if (slotIndex > 1) {
        doc.addPage();
        slotIndex = 0;
      }

      const result =
        drawSlipSegment(
          doc,
          order,
          brand,
          itemIndex,
          slotIndex,
          continued
        );

      rendered = true;
      slotIndex += 1;

      if (!items.length) {
        break;
      }

      itemIndex =
        result.nextIndex;

      continued =
        result.hasMore;
    } while (
      !rendered ||
      itemIndex < items.length
    );
  }

  const fileName =
    ids.length === 1
      ? `packing-slip-${safeFileNamePart(
          String(ids[0])
        )}.pdf`
      : `packing-slips-${ids.length}-orders.pdf`;

  await savePdf(
    doc,
    fileName
  );
}

const PackingSlipPdfClient = {
  async generateForOrders(
    ids: number[],
    fallbackStoreName = "Your Store"
  ) {
    if (
      !Array.isArray(ids) ||
      ids.length === 0
    ) {
      return;
    }

    await buildPdf(
      ids,
      fallbackStoreName
    );
  },
};

export default PackingSlipPdfClient;
