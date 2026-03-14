// src/app/api/metrics/products/route.ts
import { NextResponse } from "next/server";
import { getWooClient } from "@/lib/woo";

type WooProduct = {
  stock_status?: "instock" | "outofstock" | "onbackorder" | string;
};

export async function GET() {
  try {
    const woo = await getWooClient();
    // Fetch a batch. If you have >100 products, we can paginate later.
    const res = await woo.get("/products", {
      params: {
        per_page: 100,
        page: 1,
        status: "publish",
      },
    });

    const products = (res.data || []) as WooProduct[];

    let inStock = 0;
    let outOfStock = 0;

    for (const p of products) {
      const st = (p.stock_status || "").toLowerCase();
      if (st === "instock") inStock += 1;
      else if (st === "outofstock") outOfStock += 1;
    }

    return NextResponse.json({
      total: products.length,
      inStock,
      outOfStock,
    });
  } catch (e: any) {
    console.error("Failed to load product metrics", e?.response?.data || e);
    return NextResponse.json(
      { error: "Failed to load product metrics" },
      { status: 500 }
    );
  }
}