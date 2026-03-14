// src/app/api/categories/[id]/update/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getWooClient } from "@/lib/woo";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PUT(req: NextRequest, context: RouteContext) {
  try {
    const woo = await getWooClient();
    const { id } = await context.params;

    const numericId = Number(id);
    if (!Number.isFinite(numericId) || numericId <= 0) {
      return NextResponse.json(
        { error: "Invalid category ID" },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    const name =
      typeof body.name === "string" ? body.name.trim() : "";
    const slug =
      typeof body.slug === "string" ? body.slug.trim() : "";
    const description =
      typeof body.description === "string" ? body.description.trim() : "";
    const parent = Number(body.parent || 0);

    if (!name) {
      return NextResponse.json(
        { error: "Category name is required" },
        { status: 400 }
      );
    }

    if (!Number.isFinite(parent) || parent < 0) {
      return NextResponse.json(
        { error: "Invalid parent category" },
        { status: 400 }
      );
    }

    if (parent === numericId) {
      return NextResponse.json(
        { error: "A category cannot be its own parent" },
        { status: 400 }
      );
    }

    const payload: any = {
      name,
      parent,
      description,
    };

    if (slug) {
      payload.slug = slug;
    }

    const { data } = await woo.put(`/products/categories/${numericId}`, payload);

    return NextResponse.json({
      ok: true,
      category: {
        id: data.id,
        name: data.name,
        slug: data.slug,
        parent: data.parent,
        description: data.description || "",
        count: data.count ?? 0,
      },
    });
  } catch (e: any) {
    const status = e?.response?.status || 500;
    const msg =
      e?.response?.data?.message ||
      e?.response?.data?.error ||
      e?.message ||
      "Update failed";

    return NextResponse.json({ error: String(msg) }, { status });
  }
}