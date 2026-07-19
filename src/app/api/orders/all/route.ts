import { getWooClient } from "@/lib/woo";
import type { WCOrder } from "@/lib/order-utils";
import {
  logOrderError,
  privateJson,
  requestErrorResponse,
} from "@/lib/orderPolicy";

export const dynamic = "force-dynamic";

async function fetchOrders(): Promise<WCOrder[]> {
  const woo = await getWooClient();
  const orders: WCOrder[] = [];

  for (let page = 1; page <= 50; page += 1) {
    const { data } = await woo.get<WCOrder[]>("/orders", {
      params: {
        per_page: 100,
        page,
        order: "desc",
        orderby: "date",
        status: "any",
      },
    });

    if (!Array.isArray(data)) {
      throw new Error("Unexpected order service response");
    }

    if (data.length === 0) break;
    orders.push(...data);
    if (data.length < 100) break;
  }

  return orders;
}

export async function GET() {
  try {
    return privateJson({
      ok: true,
      data: await fetchOrders(),
    });
  } catch (error) {
    logOrderError("all", error);
    return requestErrorResponse(error, "Failed to load orders.");
  }
}
