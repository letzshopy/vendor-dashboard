import {
  records,
  responsePages,
  type JsonRecord,
} from "@/lib/reportPolicy";
import { getWooClient } from "@/lib/woo";

type FetchOrdersRangeParams = {
  date_from?: string;
  date_to?: string;
  status?: string;
  maxPages?: number;
};

export async function fetchOrdersRange({
  date_from = "",
  date_to = "",
  status = "all",
  maxPages = 20,
}: FetchOrdersRangeParams): Promise<JsonRecord[]> {
  const woo = await getWooClient();
  const pageLimit = Math.min(50, Math.max(1, Number(maxPages) || 20));
  const params: Record<string, unknown> = {
    per_page: 100,
    page: 1,
    orderby: "date",
    order: "desc",
  };

  if (status && status !== "all" && status !== "any") params.status = status;
  if (date_from) params.after = `${date_from}T00:00:00`;
  if (date_to) params.before = `${date_to}T23:59:59`;

  const first = await woo.get("/orders", { params });
  const orders = records(first.data);
  const totalPages = responsePages(first.headers, pageLimit);

  if (totalPages > 1) {
    const remaining = await Promise.all(
      Array.from({ length: totalPages - 1 }, (_, index) =>
        woo.get("/orders", { params: { ...params, page: index + 2 } }),
      ),
    );
    for (const response of remaining) orders.push(...records(response.data));
  }

  return orders;
}
