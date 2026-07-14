import {
  csvResponse,
  exportErrorResponse,
  stringifyExportCsv,
} from "@/lib/exportPolicy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const headers = [
      "id", "sku", "name", "regular_price", "sale_price", "stock_status",
      "manage_stock", "stock_quantity", "type", "categories", "short_description",
      "description", "images", "Grouped products", "Attribute 1 name",
      "Attribute 1 value(s)", "Attribute 1 visible", "Attribute 1 global",
    ];
    const row = [
      "", "SKU1001", "Sample Saree", "1299", "999", "instock", "1", "20",
      "simple", "Cotton Sarees > South", "Short desc", "Long description here",
      "https://example.com/img1.jpg|https://example.com/img2.jpg", "", "Fabric",
      "Cotton", "1", "1",
    ];

    return csvResponse(
      stringifyExportCsv([headers, row]),
      "sample-products.csv",
    );
  } catch (error: unknown) {
    return exportErrorResponse(error, "Unable to prepare sample product export");
  }
}
