import { getWooClient } from "@/lib/woo";
import {
  normalizePaymentLedgerRow,
  type PaymentLedgerOrderLike,
} from "@/lib/payment-ledger";
import { requireStoreFeature } from "@/lib/storeCapabilityServer";
import {
  OrderRequestError,
  parseBoundedString,
  parsePositiveInteger,
  privateJson,
} from "@/lib/orderPolicy";
import type {
  CurrencyTotal,
  PaymentLedgerMethodFilter,
  PaymentLedgerRow,
  PaymentLedgerSummary,
} from "@/types/payment-ledger";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const WOO_PAGE_SIZE = 100;
const MAX_WOO_PAGES = 50;

const METHOD_FILTERS =
  new Set<PaymentLedgerMethodFilter>([
    "all",
    "payglocal",
    "manual_upi",
    "bank_transfer",
    "cod",
    "other",
  ]);

function parseDate(
  value: string,
  field: string
): string {
  if (!value) {
    return "";
  }

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      value
    )
  ) {
    throw new OrderRequestError(
      `${field} is invalid.`
    );
  }

  const date = new Date(
    `${value}T00:00:00Z`
  );

  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !==
      value
  ) {
    throw new OrderRequestError(
      `${field} is invalid.`
    );
  }

  return value;
}

function timestampFromGmt(
  value: string
): number | null {
  if (!value) {
    return null;
  }

  const raw = value.endsWith("Z")
    ? value
    : `${value}Z`;

  const timestamp = Date.parse(raw);

  return Number.isNaN(timestamp)
    ? null
    : timestamp;
}

function rowInsideDateRange(
  row: PaymentLedgerRow,
  from: string,
  to: string
): boolean {
  if (!from && !to) {
    return true;
  }

  const timestamp =
    timestampFromGmt(
      row.createdAtGmt
    );

  if (timestamp === null) {
    return false;
  }

  if (from) {
    const fromTimestamp = Date.parse(
      `${from}T00:00:00Z`
    );

    if (timestamp < fromTimestamp) {
      return false;
    }
  }

  if (to) {
    const toTimestamp = Date.parse(
      `${to}T23:59:59.999Z`
    );

    if (timestamp > toTimestamp) {
      return false;
    }
  }

  return true;
}

function normalizedSearchText(
  value: unknown
): string {
  return typeof value === "string"
    ? value.trim().toLowerCase()
    : String(value || "")
        .trim()
        .toLowerCase();
}

function rowMatchesSearch(
  row: PaymentLedgerRow,
  search: string
): boolean {
  if (!search) {
    return true;
  }

  const needle =
    normalizedSearchText(search);

  const fields = [
    row.orderId,
    row.orderNumber,
    row.customer.name,
    row.customer.email,
    row.customer.phone,
    row.paymentMethod.id,
    row.paymentMethod.title,
    row.paymentStatus.label,
    row.woo.orderStatus,
    row.reference?.value || "",
    row.reference?.label || "",
    row.manualUpi?.transactionId || "",
  ];

  return fields.some((field) =>
    normalizedSearchText(
      field
    ).includes(needle)
  );
}

function numberFromHeader(
  value: unknown
): number | null {
  const parsed = Number(value);

  return Number.isFinite(parsed) &&
    parsed >= 0
    ? parsed
    : null;
}

async function fetchWooOrders():
  Promise<PaymentLedgerOrderLike[]> {
  const woo = await getWooClient();

  const firstResponse =
    await woo.get<
      PaymentLedgerOrderLike[]
    >("/orders", {
      params: {
        per_page: WOO_PAGE_SIZE,
        page: 1,
        status: "any",
        orderby: "date",
        order: "desc",
      },
    });

  if (
    !Array.isArray(
      firstResponse.data
    )
  ) {
    throw new Error(
      "Unexpected order service response"
    );
  }

  const orders = [
    ...firstResponse.data,
  ];

  const totalPages =
    numberFromHeader(
      firstResponse.headers[
        "x-wp-totalpages"
      ]
    );

  if (
    totalPages !== null &&
    totalPages > MAX_WOO_PAGES
  ) {
    throw new OrderRequestError(
      "Payment history is too large to load safely in one request.",
      409
    );
  }

  if (
    totalPages !== null &&
    totalPages > 1
  ) {
    for (
      let page = 2;
      page <= totalPages;
      page += 1
    ) {
      const response =
        await woo.get<
          PaymentLedgerOrderLike[]
        >("/orders", {
          params: {
            per_page:
              WOO_PAGE_SIZE,
            page,
            status: "any",
            orderby: "date",
            order: "desc",
          },
        });

      if (
        !Array.isArray(
          response.data
        )
      ) {
        throw new Error(
          "Unexpected order service response"
        );
      }

      orders.push(
        ...response.data
      );
    }

    return orders;
  }

  if (
    totalPages === null &&
    firstResponse.data.length ===
      WOO_PAGE_SIZE
  ) {
    for (
      let page = 2;
      page <= MAX_WOO_PAGES;
      page += 1
    ) {
      const response =
        await woo.get<
          PaymentLedgerOrderLike[]
        >("/orders", {
          params: {
            per_page:
              WOO_PAGE_SIZE,
            page,
            status: "any",
            orderby: "date",
            order: "desc",
          },
        });

      if (
        !Array.isArray(
          response.data
        )
      ) {
        throw new Error(
          "Unexpected order service response"
        );
      }

      if (
        response.data.length === 0
      ) {
        break;
      }

      orders.push(
        ...response.data
      );

      if (
        response.data.length <
        WOO_PAGE_SIZE
      ) {
        break;
      }

      if (
        page === MAX_WOO_PAGES
      ) {
        throw new OrderRequestError(
          "Payment history is too large to load safely in one request.",
          409
        );
      }
    }
  }

  return orders;
}

function amountNumber(
  value: string
): number {
  const parsed = Number(value);

  if (
    !Number.isFinite(parsed)
  ) {
    return 0;
  }

  return Math.round(
    parsed * 100
  ) / 100;
}

function currencyTotals(
  rows: PaymentLedgerRow[],
  predicate: (
    row: PaymentLedgerRow
  ) => boolean = () => true
): CurrencyTotal[] {
  const totals =
    new Map<string, number>();

  for (const row of rows) {
    if (!predicate(row)) {
      continue;
    }

    const currency =
      String(
        row.currency || "INR"
      ).toUpperCase();

    totals.set(
      currency,
      Math.round(
        (
          (totals.get(currency) ||
            0) +
          amountNumber(row.amount)
        ) * 100
      ) / 100
    );
  }

  return [...totals.entries()]
    .sort(([first], [second]) =>
      first.localeCompare(second)
    )
    .map(
      ([currency, amount]) => ({
        currency,
        amount:
          amount.toFixed(2),
      })
    );
}

function buildSummary(
  rows: PaymentLedgerRow[]
): PaymentLedgerSummary {
  const methods = {
    payglocal: 0,
    manualUpi: 0,
    bankTransfer: 0,
    cod: 0,
    other: 0,
  };

  let manualUpiPendingVerification =
    0;

  for (const row of rows) {
    switch (
      row.paymentMethod.kind
    ) {
      case "payglocal":
        methods.payglocal += 1;
        break;

      case "manual_upi":
        methods.manualUpi += 1;
        break;

      case "bank_transfer":
        methods.bankTransfer += 1;
        break;

      case "cod":
        methods.cod += 1;
        break;

      default:
        methods.other += 1;
        break;
    }

    if (
      row.paymentStatus.code ===
      "pending-verification"
    ) {
      manualUpiPendingVerification +=
        1;
    }
  }

  return {
    totalTransactions:
      rows.length,

    methods,

    manualUpiPendingVerification,

    orderValue:
      currencyTotals(rows),

    wooRecordedPaidValue:
      currencyTotals(
        rows,
        (row) =>
          row.woo.paidRecorded
      ),
  };
}

export async function GET(
  request: Request
) {
  const storeFeatureError =
    await requireStoreFeature(
      "payments"
    );

  if (storeFeatureError) {
    return storeFeatureError;
  }

  try {
    const url = new URL(
      request.url
    );

    const page =
      parsePositiveInteger(
        url.searchParams.get(
          "page"
        ) || "1",
        "Page",
        100_000
      );

    const perPage =
      parsePositiveInteger(
        url.searchParams.get(
          "per_page"
        ) || "25",
        "Rows per page",
        100
      );

    const search =
      parseBoundedString(
        url.searchParams.get(
          "s"
        ) || "",
        "Search",
        120
      );

    const methodRaw =
      parseBoundedString(
        url.searchParams.get(
          "method"
        ) || "all",
        "Payment method",
        40,
        { required: true }
      ).toLowerCase();

    if (
      !METHOD_FILTERS.has(
        methodRaw as PaymentLedgerMethodFilter
      )
    ) {
      throw new OrderRequestError(
        "Payment method is invalid."
      );
    }

    const method =
      methodRaw as PaymentLedgerMethodFilter;

    const dateFrom = parseDate(
      url.searchParams.get(
        "date_from"
      ) || "",
      "Start date"
    );

    const dateTo = parseDate(
      url.searchParams.get(
        "date_to"
      ) || "",
      "End date"
    );

    if (
      dateFrom &&
      dateTo &&
      dateFrom > dateTo
    ) {
      throw new OrderRequestError(
        "Start date cannot be after end date."
      );
    }

    const orders =
      await fetchWooOrders();

    const normalized =
      orders.map(
        normalizePaymentLedgerRow
      );

    const filtered =
      normalized.filter(
        (row) => {
          if (
            method !== "all" &&
            row.paymentMethod.kind !==
              method
          ) {
            return false;
          }

          if (
            !rowInsideDateRange(
              row,
              dateFrom,
              dateTo
            )
          ) {
            return false;
          }

          return rowMatchesSearch(
            row,
            search
          );
        }
      );

    const summary =
      buildSummary(filtered);

    const total =
      filtered.length;

    const totalPages =
      Math.max(
        1,
        Math.ceil(
          total / perPage
        )
      );

    const start =
      (page - 1) *
      perPage;

    const rows =
      filtered.slice(
        start,
        start + perPage
      );

    return privateJson({
      ok: true,
      rows,
      summary,
      pagination: {
        page,
        perPage,
        total,
        totalPages,
      },
    });
  } catch (error: unknown) {
    if (
      error instanceof
      OrderRequestError
    ) {
      return privateJson(
        {
          ok: false,
          error: error.message,
        },
        error.status
      );
    }

    console.error(
      "[payments:ledger]",
      error instanceof Error
        ? error.message
        : "Unknown payments ledger error"
    );

    return privateJson(
      {
        ok: false,
        error:
          "Failed to load payment transactions.",
      },
      502
    );
  }
}
