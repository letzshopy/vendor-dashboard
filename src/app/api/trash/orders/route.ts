import {
  getWooClient,
} from "@/lib/woo";
import {
  isRecord,
  logOrderError,
  OrderRequestError,
  parseBoundedString,
  parseOrderId,
  privateJson,
  readJsonObject,
  requestErrorResponse,
} from "@/lib/orderPolicy";

const TRASH_PREVIOUS_STATUS_META =
  "_letzshopy_trash_previous_status";

const RESTORABLE_STATUSES = new Set([
  "pending",
  "processing",
  "on-hold",
  "completed",
  "cancelled",
  "refunded",
  "failed",
]);

type JsonRecord =
  Record<string, unknown>;

function cleanIds(
  value: unknown
): number[] {
  if (!Array.isArray(value)) {
    throw new OrderRequestError(
      "At least one order must be selected."
    );
  }

  const ids =
    Array.from(
      new Set(
        value.map(parseOrderId)
      )
    );

  if (
    ids.length === 0
  ) {
    throw new OrderRequestError(
      "At least one order must be selected."
    );
  }

  if (
    ids.length > 50
  ) {
    throw new OrderRequestError(
      "A maximum of 50 orders can be updated at once."
    );
  }

  return ids;
}

function previousStatus(
  value: unknown
): string {
  if (
    !isRecord(value) ||
    !Array.isArray(
      value.meta_data
    )
  ) {
    return "";
  }

  const entry =
    value.meta_data.find(
      (item) =>
        isRecord(item) &&
        item.key ===
          TRASH_PREVIOUS_STATUS_META
    );

  if (
    !isRecord(entry)
  ) {
    return "";
  }

  const status =
    String(
      entry.value || ""
    )
      .trim()
      .toLowerCase();

  return RESTORABLE_STATUSES.has(
    status
  )
    ? status
    : "";
}

function orderSummary(
  value: unknown
) {
  if (!isRecord(value)) {
    return null;
  }

  const id =
    Number(value.id);

  if (
    !Number.isSafeInteger(id) ||
    id <= 0
  ) {
    return null;
  }

  const billing =
    isRecord(value.billing)
      ? value.billing
      : {};

  const customer =
    [
      billing.first_name,
      billing.last_name,
    ]
      .map(
        (part) =>
          typeof part ===
          "string"
            ? part.trim()
            : ""
      )
      .filter(Boolean)
      .join(" ");

  const itemCount =
    Array.isArray(
      value.line_items
    )
      ? value.line_items.reduce(
          (
            total,
            item
          ) => {
            if (!isRecord(item)) {
              return total;
            }

            const quantity =
              Number(
                item.quantity
              );

            return total +
              (
                Number.isFinite(
                  quantity
                )
                  ? Math.max(
                      0,
                      quantity
                    )
                  : 0
              );
          },
          0
        )
      : 0;

  return {
    id,
    number:
      typeof value.number ===
      "string"
        ? value.number
        : String(id),
    total:
      typeof value.total ===
      "string"
        ? value.total
        : String(
            value.total || "0"
          ),
    currency:
      typeof value.currency ===
      "string"
        ? value.currency
        : "INR",
    date:
      typeof value.date_created ===
      "string"
        ? value.date_created
        : typeof value.date_modified ===
            "string"
          ? value.date_modified
          : null,
    customer:
      customer ||
      "Customer",
    email:
      typeof billing.email ===
      "string"
        ? billing.email
        : "",
    itemCount,
    previousStatus:
      previousStatus(
        value
      ),
  };
}

async function getAllTrashedOrders() {
  const woo =
    await getWooClient();
  const rows:
    unknown[] = [];

  for (
    let page = 1;
    page <= 10;
    page += 1
  ) {
    const response =
      await woo.get(
        "/orders",
        {
          params: {
            status:
              "trash",
            per_page:
              100,
            page,
            orderby:
              "date",
            order:
              "desc",
          },
        }
      );

    if (
      !Array.isArray(
        response.data
      ) ||
      response.data
        .length === 0
    ) {
      break;
    }

    rows.push(
      ...response.data
    );

    if (
      response.data
        .length < 100
    ) {
      break;
    }
  }

  return rows
    .map(orderSummary)
    .filter(
      (
        item
      ): item is NonNullable<
        ReturnType<
          typeof orderSummary
        >
      > =>
        item !== null
    );
}

export async function GET() {
  try {
    const items =
      await getAllTrashedOrders();

    return privateJson({
      items,
    });
  } catch (
    error
  ) {
    logOrderError(
      "trash-list",
      error
    );

    return requestErrorResponse(
      error,
      "Failed to load order trash."
    );
  }
}

export async function POST(
  request: Request
) {
  try {
    const body =
      await readJsonObject(
        request,
        24 * 1024
      );

    const action =
      parseBoundedString(
        body.action,
        "Trash action",
        20,
        {
          required:
            true,
        }
      ).toLowerCase();

    if (
      action !==
        "restore" &&
      action !==
        "delete"
    ) {
      throw new OrderRequestError(
        "Trash action is invalid."
      );
    }

    const ids =
      cleanIds(
        body.ids
      );

    const woo =
      await getWooClient();

    const results:
      Array<{
        id: number;
        status?: string;
      }> = [];

    for (
      const id of ids
    ) {
      if (
        action ===
        "delete"
      ) {
        await woo.delete(
          `/orders/${id}`,
          {
            params: {
              force: true,
            },
          }
        );

        results.push({
          id,
        });

        continue;
      }

      const current =
        await woo.get(
          `/orders/${id}`
        );

      const restoreStatus =
        previousStatus(
          current.data
        ) ||
        "pending";

      const response =
        await woo.put(
          `/orders/${id}`,
          {
            status:
              restoreStatus,
            meta_data: [
              {
                key:
                  TRASH_PREVIOUS_STATUS_META,
                value: "",
              },
            ],
          }
        );

      const status =
        isRecord(
          response.data
        ) &&
        typeof response
          .data.status ===
          "string"
          ? response.data
              .status
          : restoreStatus;

      results.push({
        id,
        status,
      });
    }

    return privateJson({
      ok: true,
      action,
      results,
    });
  } catch (
    error
  ) {
    logOrderError(
      "trash-action",
      error
    );

    return requestErrorResponse(
      error,
      "Order trash action failed."
    );
  }
}
