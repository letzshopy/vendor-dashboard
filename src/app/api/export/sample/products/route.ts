import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const headers = [
    "id","sku","name","regular_price","sale_price","stock_status","manage_stock","stock_quantity",
    "type","categories","short_description","description","images","Grouped products",
    "Attribute 1 name","Attribute 1 value(s)","Attribute 1 visible","Attribute 1 global",
  ];
  const row = [
    "", "SKU1001", "Sample Saree", "1299", "999", "instock", "1", "20",
    "simple", "Cotton Sarees > South", "Short desc", "Long description here",
    "https://example.com/img1.jpg|https://example.com/img2.jpg", "",
    "Fabric", "Cotton", "1", "1",
  ];
  const csv = headers.join(",") + "\n" + row.map((v) => `"${String(v).replace(/"/g,'""')}"`).join(",");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="sample-products.csv"`,
    },
  });
}
