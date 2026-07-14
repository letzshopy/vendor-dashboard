import { getWooClient } from "@/lib/woo";
import {
  isRecord,
  logOrderError,
  OrderRequestError,
  parseAmount,
  parseBoundedString,
  parseEmail,
  parseOrderId,
  parsePositiveInteger,
  privateJson,
  readJsonObject,
  requestErrorResponse,
} from "@/lib/orderPolicy";

type RouteParams = {
  params: Promise<{ id: string }>;
};

type AddressPayload = Record<string, string>;

const ADDRESS_LIMITS: Record<string, number> = {
  first_name: 100,
  last_name: 100,
  company: 160,
  address_1: 240,
  address_2: 240,
  city: 100,
  state: 100,
  postcode: 20,
  country: 2,
  phone: 30,
  email: 254,
};

function parseAddress(
  value: unknown,
  field: string,
  includeContact: boolean
): AddressPayload {
  if (!isRecord(value)) {
    throw new OrderRequestError(`${field} is invalid.`);
  }

  const allowedKeys = Object.keys(ADDRESS_LIMITS).filter(
    (key) => includeContact || (key !== "phone" && key !== "email")
  );
  const result: AddressPayload = {};

  for (const key of allowedKeys) {
    const raw = value[key];
    result[key] =
      key === "email"
        ? parseEmail(raw)
        : parseBoundedString(
            raw,
            `${field} ${key.replaceAll("_", " ")}`,
            ADDRESS_LIMITS[key]
          );
  }

  if (
    result.country &&
    !/^[A-Za-z]{2}$/.test(result.country)
  ) {
    throw new OrderRequestError(`${field} country is invalid.`);
  }

  if (
    result.phone &&
    !/^[+()\-\s0-9]{6,30}$/.test(result.phone)
  ) {
    throw new OrderRequestError(`${field} phone is invalid.`);
  }

  return result;
}

function parseLineItems(value: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(value)) {
    throw new OrderRequestError("Order items are invalid.");
  }

  if (value.length > 100) {
    throw new OrderRequestError(
      "An order cannot contain more than 100 items."
    );
  }

  return value.flatMap((raw, index) => {
    if (!isRecord(raw)) {
      throw new OrderRequestError(
        `Order item ${index + 1} is invalid.`
      );
    }

    const isNew = raw.isNew === true;
    const removed = raw.removed === true;

    if (isNew && removed) return [];

    const id = raw.id
      ? parsePositiveInteger(
          raw.id,
          `Order item ${index + 1} ID`,
          2_147_483_647
        )
      : undefined;

    if (removed) {
      if (!id) {
        throw new OrderRequestError(
          `Order item ${index + 1} cannot be removed.`
        );
      }

      return [{ id, quantity: 0 }];
    }

    const productId = raw.product_id
      ? parsePositiveInteger(
          raw.product_id,
          `Order item ${index + 1} product`,
          2_147_483_647
        )
      : undefined;
    const quantity = parsePositiveInteger(
      raw.quantity,
      `Order item ${index + 1} quantity`,
      10_000
    );
    const price = parseAmount(
      raw.price,
      `Order item ${index + 1} price`
    );
    const name = parseBoundedString(
      raw.name,
      `Order item ${index + 1} name`,
      240,
      { required: true }
    );
    const sku = parseBoundedString(
      raw.sku,
      `Order item ${index + 1} SKU`,
      100
    );

    if (isNew && !productId) {
      throw new OrderRequestError(
        `Order item ${index + 1} must reference a product.`
      );
    }

    if (!isNew && !id) {
      throw new OrderRequestError(
        `Order item ${index + 1} ID is required.`
      );
    }

    const total = (quantity * price).toFixed(2);
    const item: Record<string, unknown> = {
      name,
      quantity,
      subtotal: total,
      total,
    };

    if (id && !isNew) item.id = id;
    if (productId) item.product_id = productId;
    if (sku) item.sku = sku;

    return [item];
  });
}

export async function PATCH(
  request: Request,
  { params }: RouteParams
) {
  try {
    const { id } = await params;
    const orderId = parseOrderId(id);
    const body = await readJsonObject(request, 128 * 1024);
    const payload: Record<string, unknown> = {};

    if (Object.hasOwn(body, "billing")) {
      payload.billing = parseAddress(
        body.billing,
        "Billing address",
        true
      );
    }

    if (Object.hasOwn(body, "shipping")) {
      payload.shipping = parseAddress(
        body.shipping,
        "Shipping address",
        false
      );
    }

    if (Object.hasOwn(body, "items")) {
      payload.line_items = parseLineItems(body.items);
    }

    if (Object.keys(payload).length === 0) {
      throw new OrderRequestError(
        "No editable order fields were provided."
      );
    }

    const woo = await getWooClient();
    const { data } = await woo.put(
      `/orders/${orderId}`,
      payload
    );

    return privateJson(data);
  } catch (error) {
    logOrderError("edit", error);
    return requestErrorResponse(error, "Failed to update order.");
  }
}
