import { fetchInternalWp } from "@/lib/wpClient";
import {
  logOrderError,
  parseOrderId,
  privateJson,
  requestErrorResponse,
} from "@/lib/orderPolicy";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const ALLOWED_PROOF_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);
const MAX_PROOF_BYTES = 5 * 1024 * 1024;

export async function GET(
  _request: Request,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const orderId = parseOrderId(id);
    const response = await fetchInternalWp(
      `/wp-json/letz/v1/orders/${orderId}/upi-proof`,
      { method: "GET" }
    );

    if (!response.ok) {
      const status = response.status === 404 ? 404 : 502;
      return privateJson(
        { ok: false, error: "Payment proof is unavailable." },
        status
      );
    }

    const contentType = (response.headers.get("content-type") || "")
      .split(";", 1)[0]
      .trim()
      .toLowerCase();

    if (!ALLOWED_PROOF_TYPES.has(contentType)) {
      throw new Error("Unexpected payment proof type");
    }

    const declaredLength = Number(
      response.headers.get("content-length") || "0"
    );

    if (
      Number.isFinite(declaredLength) &&
      declaredLength > MAX_PROOF_BYTES
    ) {
      throw new Error("Payment proof is too large");
    }

    const proof = await response.arrayBuffer();

    if (proof.byteLength === 0 || proof.byteLength > MAX_PROOF_BYTES) {
      throw new Error("Invalid payment proof response");
    }

    return new Response(proof, {
      status: 200,
      headers: {
        "Cache-Control": "private, no-store, max-age=0",
        Pragma: "no-cache",
        "Content-Type": contentType,
        "Content-Disposition": "inline",
        "Content-Length": String(proof.byteLength),
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    logOrderError("upi-proof", error);
    return requestErrorResponse(
      error,
      "Payment proof is unavailable."
    );
  }
}
