import { getWooClient } from "@/lib/woo";
import type { WCOrder } from "@/lib/order-utils";
import {
  logOrderError,
  parseOrderId,
  privateJson,
  requestErrorResponse,
} from "@/lib/orderPolicy";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(
  _request: Request,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const orderId = parseOrderId(id);
    const woo = await getWooClient();
    const { data } = await woo.get<WCOrder>(
      `/orders/${orderId}`
    );

    return privateJson(data);
  } catch (error) {
    logOrderError("view", error);
    return requestErrorResponse(error, "Failed to load order.");
  }
}
