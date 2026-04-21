// src/app/api/products/[id]/view/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getWooClient } from "@/lib/woo";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function getMetaValue(metaData: any[], key: string) {
  if (!Array.isArray(metaData)) return "";
  const row = metaData.find((m) => m?.key === key);
  return row?.value ? String(row.value) : "";
}

export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const woo = await getWooClient();
    const { id } = await context.params;

    const { data } = await woo.get(`/products/${id}`);

    return NextResponse.json({
      product: {
        ...data,
        color: getMetaValue(data?.meta_data, "_ls_color"),
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      {
        error:
          e?.response?.data ||
          e?.response?.data?.message ||
          e?.message ||
          "Fetch failed",
      },
      { status: 500 }
    );
  }
}