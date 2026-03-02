import { NextResponse } from "next/server";
import { woo } from "@/lib/woo";

/**
 * Upsert a Standard tax rate for India.
 * Body: { ratePercent?: number, label?: string, scope?: "all"|"state", state?: string }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const ratePercent = Number(body.ratePercent ?? 5);
    const label = String(body.label ?? `GST ${ratePercent}%`);
    const scope = (body.scope === "state" ? "state" : "all") as "all" | "state";
    const state = scope === "state" ? String(body.state || "").toUpperCase() : "";

    const payload = {
      country: "IN",
      state,                 // "" = all states (nationwide)
      postcode: "",
      city: "",
      rate: ratePercent.toFixed(4), // "5.0000"
      name: label,
      priority: 1,
      compound: false,
      shipping: true,
      order: 0,
      class: "standard",     // ← REST API expects "standard"
    };

    // Fetch existing *Standard* rates and see if one matches (country/state)
    const { data: existing } = await woo.get("/taxes", {
      params: { per_page: 100, class: "standard" },
    });

    const match = Array.isArray(existing)
      ? existing.find((r: any) =>
          String(r.country) === "IN" &&
          String(r.state || "") === state &&
          String(r.class || "") === "standard"
        )
      : null;

    if (match) {
      const { data: updated } = await woo.put(`/taxes/${match.id}`, payload);
      return NextResponse.json({ ok: true, mode: "updated", rate: updated });
    } else {
      const { data: created } = await woo.post("/taxes", payload);
      return NextResponse.json({ ok: true, mode: "created", rate: created });
    }
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Failed to upsert tax rate" },
      { status: 500 }
    );
  }
}
