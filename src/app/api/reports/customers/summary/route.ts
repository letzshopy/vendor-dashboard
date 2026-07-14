import {
  customerErrorResponse,
  orderRows,
  privateCustomerJson,
  responseTotal,
  responseTotalPages,
  safePositiveId,
} from "@/lib/customerPolicy";
import { getWooClient } from "@/lib/woo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const woo = await getWooClient();
    let registered = 0;

    try {
      const response = await woo.get("/customers", {
        params: { per_page: 1, page: 1 },
      });
      registered = responseTotal(response.headers);
    } catch (error: unknown) {
      console.error("Registered customer count failed", error instanceof Error ? error.message : "Unknown error");
    }

    const first = await woo.get("/orders", {
      params: { per_page: 100, page: 1 },
    });
    const totalOrders = responseTotal(first.headers);
    let ordersWithRegisteredCustomer = orderRows(first.data).filter(
      (order) => safePositiveId(order.customer_id) > 0,
    ).length;
    const totalPages = responseTotalPages(first.headers, 200);

    for (let page = 2; page <= totalPages; page += 1) {
      const response = await woo.get("/orders", {
        params: { per_page: 100, page },
      });
      ordersWithRegisteredCustomer += orderRows(response.data).filter(
        (order) => safePositiveId(order.customer_id) > 0,
      ).length;
    }

    return privateCustomerJson({
      registered,
      guest: Math.max(0, totalOrders - ordersWithRegisteredCustomer),
      totalOrders,
    });
  } catch (error: unknown) {
    return customerErrorResponse(error, "Failed to load customer summary");
  }
}
