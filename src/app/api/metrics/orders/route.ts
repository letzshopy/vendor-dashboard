import {
  isRecord,
  privateReportJson,
  records,
  reportErrorResponse,
  responsePages,
  safeId,
  safeNumber,
  safeText,
} from "@/lib/reportPolicy";
import { getWooClient } from "@/lib/woo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function paidStatus(status: string): boolean {
  return status === "completed" || status === "processing";
}

function validDate(value: unknown): Date | null {
  const date = new Date(safeText(value, 40));
  return Number.isNaN(date.getTime()) ? null : date;
}

function sameDay(left: Date, right: Date): boolean {
  return left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate();
}

export async function GET() {
  try {
    const woo = await getWooClient();
    const first = await woo.get("/orders", {
      params: {
        per_page: 100,
        page: 1,
        orderby: "date",
        order: "desc",
        _fields: "id,number,status,total,date_created,billing",
      },
    });
    const orders = records(first.data);
    const totalPages = responsePages(first.headers, 20);

    if (totalPages > 1) {
      const remaining = await Promise.all(
        Array.from({ length: totalPages - 1 }, (_, index) =>
          woo.get("/orders", {
            params: {
              per_page: 100,
              page: index + 2,
              orderby: "date",
              order: "desc",
              _fields: "id,number,status,total,date_created,billing",
            },
          }),
        ),
      );
      for (const response of remaining) orders.push(...records(response.data));
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const last30 = new Date(today);
    last30.setDate(last30.getDate() - 29);

    let todaySales = 0;
    let monthSales = 0;
    let ordersLast30 = 0;
    let pendingOnHold = 0;
    let completed = 0;
    let processing = 0;
    let onHold = 0;
    const revenueByWeek = [
      { label: "Week 1", total: 0 },
      { label: "Week 2", total: 0 },
      { label: "Week 3", total: 0 },
      { label: "Week 4", total: 0 },
    ];

    for (const order of orders) {
      const status = safeText(order.status, 40).toLowerCase();
      const date = validDate(order.date_created);
      const total = safeNumber(order.total);

      if (status === "on-hold") pendingOnHold += 1;
      if (!date) continue;

      if (paidStatus(status)) {
        if (sameDay(date, today)) todaySales += total;
        if (
          date >= monthStart &&
          date.getFullYear() === now.getFullYear() &&
          date.getMonth() === now.getMonth()
        ) {
          monthSales += total;
        }
      }

      if (date >= last30) {
        ordersLast30 += 1;
        if (status === "completed") completed += 1;
        if (status === "processing") processing += 1;
        if (status === "on-hold") onHold += 1;

        if (paidStatus(status)) {
          const midnight = new Date(date.getFullYear(), date.getMonth(), date.getDate());
          const days = Math.floor((today.getTime() - midnight.getTime()) / 86_400_000);
          const bucket = days <= 6 ? 3 : days <= 13 ? 2 : days <= 20 ? 1 : 0;
          revenueByWeek[bucket].total += total;
        }
      }
    }

    const recentOrders = orders
      .slice()
      .sort((left, right) =>
        (validDate(right.date_created)?.getTime() || 0) -
        (validDate(left.date_created)?.getTime() || 0),
      )
      .slice(0, 5)
      .flatMap((order) => {
        const id = safeId(order.id);
        if (!id) return [];
        const billing = isRecord(order.billing) ? order.billing : {};
        const customer = [
          safeText(billing.first_name, 100),
          safeText(billing.last_name, 100),
        ].filter(Boolean).join(" ") || "Customer";
        const number = safeText(order.number, 100) || String(id);

        return [{
          id,
          number: number.startsWith("#") ? number : `#${number}`,
          customer,
          total: safeNumber(order.total),
          status: safeText(order.status, 40),
          date_created: safeText(order.date_created, 40),
        }];
      });

    return privateReportJson({
      todaySales: Number(todaySales.toFixed(2)),
      monthSales: Number(monthSales.toFixed(2)),
      totalOrders: orders.length,
      ordersLast30,
      pendingOnHold,
      statusLast30: { completed, processing, onHold },
      revenueByWeek: revenueByWeek.map((week) => ({
        ...week,
        total: Number(week.total.toFixed(2)),
      })),
      recentOrders,
    });
  } catch (error: unknown) {
    return reportErrorResponse(error, "Failed to load order metrics");
  }
}
