import { NextResponse } from "next/server";
import { getWooClient } from "@/lib/woo";

/**
 * Upsert a Standard tax rate for India.
 * Body: { ratePercent?: number, label?: string, scope?: "all"|"state", state?: string }
 */
export async function POST(req: Request) {
  try {
    const woo = await getWooClient();

    const body = await req.json().catch(() => ({}));

    let ratePercent = Number(body?.ratePercent ?? 5);
    if (!Number.isFinite(ratePercent) || ratePercent < 0) ratePercent = 0;
    if (ratePercent > 100) ratePercent = 100;

    const label = String(body?.label ?? `GST ${ratePercent}%`);

    const scope = body?.scope === "state" ? "state" : "all";
    let state = scope === "state" ? String(body?.state || "").toUpperCase().trim() : "";

    // Woo expects state codes; for India typically 2-letter (KA, TN, etc.)
    if (state) {
      state = state.replace(/[^A-Z]/g, "");
      if (state.length !== 2) {
        return NextResponse.json(
          { ok: false, error: "Invalid state code (use 2-letter like KA, TN)" },
          { status: 400 }
        );
      }
    }

    const payload: any = {
      country: "IN",
      state, // "" = all states (nationwide)
      postcode: "",
      city: "",
      rate: ratePercent.toFixed(4), // "5.0000"
      name: label,
      priority: 1,
      compound: false,
      shipping: true,
      order: 0,
      class: "standard", // REST API expects "standard"
    };

    // Fetch existing Standard rates and find match (country/state/class)
    const PER_PAGE = 100;
    const MAX_PAGES = 10; // safety cap

    let match: any = null;
    for (let page = 1; page <= MAX_PAGES; page++) {
      const { data } = await woo.get("/taxes", {
        params: { per_page: PER_PAGE, page, class: "standard" },
      });

      const existing = Array.isArray(data) ? data : [];
      match = existing.find(
        (r: any) =>
          String(r?.country || "") === "IN" &&
          String(r?.state || "") === state &&
          String(r?.class || "") === "standard"
      );

      if (match) break;
      if (existing.length < PER_PAGE) break;
    }

    if (match?.id) {
      const { data: updated } = await woo.put(`/taxes/${match.id}`, payload);
      return NextResponse.json({ ok: true, mode: "updated", rate: updated });
    }

    const { data: created } = await woo.post("/taxes", payload);
    return NextResponse.json({ ok: true, mode: "created", rate: created });
  } catch (err: any) {
    const msg =
      err?.response?.data?.message ||
      err?.response?.data?.error ||
      err?.message ||
      "Failed to upsert tax rate";

    return NextResponse.json(
      { ok: false, error: msg },
      { status: err?.response?.status || 500 }
    );
  }
}