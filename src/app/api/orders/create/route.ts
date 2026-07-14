import { getWooClient } from "@/lib/woo";
import {
  isRecord,
  logOrderError,
  OrderRequestError,
  parseAmount,
  parseBoundedString,
  parseEmail,
  parsePositiveInteger,
  privateJson,
  readJsonObject,
  requestErrorResponse,
} from "@/lib/orderPolicy";

type PaymentMethodInput =
  | "cod"
  | "upi_paid"
  | "payment_pending";

const PAYMENT_METHODS = new Set<PaymentMethodInput>([
  "cod",
  "upi_paid",
  "payment_pending",
]);

function recordOrEmpty(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function parsePaymentMethod(value: unknown): PaymentMethodInput {
  const method = parseBoundedString(
    value ?? "cod",
    "Payment method",
    32,
    { required: true }
  ) as PaymentMethodInput;

  if (!PAYMENT_METHODS.has(method)) {
    throw new OrderRequestError("Payment method is invalid.");
  }

  return method;
}

export async function POST(request: Request) {
  try {
    const body = await readJsonObject(request, 128 * 1024);
    const customer = recordOrEmpty(body.customer);
    const charges = recordOrEmpty(body.charges);
    const payment = recordOrEmpty(body.payment);
    const rawItems = body.items;

    if (!Array.isArray(rawItems) || rawItems.length === 0) {
      throw new OrderRequestError(
        "At least one product is required."
      );
    }

    if (rawItems.length > 50) {
      throw new OrderRequestError(
        "An order cannot contain more than 50 items."
      );
    }

    const customerName = parseBoundedString(
      customer.name,
      "Customer name",
      160,
      { required: true }
    );
    const mobile = parseBoundedString(
      customer.mobile,
      "Mobile number",
      30,
      { required: true }
    );
    const email = parseEmail(customer.email);
    const address = parseBoundedString(
      customer.address1,
      "Address line 1",
      240,
      { required: true }
    );
    const city = parseBoundedString(
      customer.city,
      "City",
      100,
      { required: true }
    );
    const state = parseBoundedString(
      customer.state,
      "State",
      100,
      { required: true }
    );
    const pincode = parseBoundedString(
      customer.pincode,
      "Pincode",
      12,
      { required: true }
    );

    if (!/^[+()\-\s0-9]{6,30}$/.test(mobile)) {
      throw new OrderRequestError("Mobile number is invalid.");
    }

    if (!/^[A-Za-z0-9\-\s]{3,12}$/.test(pincode)) {
      throw new OrderRequestError("Pincode is invalid.");
    }

    let merchandiseTotal = 0;
    const lineItems = rawItems.map((raw, index) => {
      if (!isRecord(raw)) {
        throw new OrderRequestError(
          `Order item ${index + 1} is invalid.`
        );
      }

      const productId = parsePositiveInteger(
        raw.product_id,
        `Order item ${index + 1} product`,
        2_147_483_647
      );
      const quantity = parsePositiveInteger(
        raw.quantity,
        `Order item ${index + 1} quantity`,
        1_000
      );
      const unitPrice = parseAmount(
        raw.unit_price,
        `Order item ${index + 1} price`
      );
      const lineTotal = Math.round(
        unitPrice * quantity * 100
      ) / 100;

      if (lineTotal > 10_000_000) {
        throw new OrderRequestError(
          `Order item ${index + 1} total is too large.`
        );
      }

      merchandiseTotal += lineTotal;

      return {
        product_id: productId,
        quantity,
        subtotal: lineTotal.toFixed(2),
        total: lineTotal.toFixed(2),
      };
    });
    const shippingCharge = parseAmount(
      charges.shipping ?? 0,
      "Shipping charge"
    );
    const discount = parseAmount(
      charges.discount ?? 0,
      "Discount"
    );

    if (discount > merchandiseTotal + shippingCharge) {
      throw new OrderRequestError(
        "Discount cannot exceed the order value."
      );
    }

    if (merchandiseTotal + shippingCharge > 10_000_000) {
      throw new OrderRequestError("Order total is too large.");
    }

    const paymentMethod = parsePaymentMethod(payment.method);
    const transactionId = parseBoundedString(
      payment.transaction_id,
      "Transaction ID / UTR",
      120
    );
    const note = parseBoundedString(
      body.note,
      "Order note",
      1_000,
      { allowNewlines: true }
    );

    if (paymentMethod === "upi_paid" && !transactionId) {
      throw new OrderRequestError(
        "Transaction ID / UTR is required for UPI Paid."
      );
    }

    let status = "processing";
    let wooPaymentMethod = "cod";
    let paymentTitle = "Cash on Delivery";

    if (paymentMethod === "upi_paid") {
      wooPaymentMethod = "letz_manual_upi";
      paymentTitle = "UPI Paid";
    } else if (paymentMethod === "payment_pending") {
      status = "on-hold";
      wooPaymentMethod = "letz_payment_pending";
      paymentTitle = "Payment Pending";
    }

    const metaData: Array<{ key: string; value: string }> = [
      { key: "manual_order_source", value: "dashboard" },
      { key: "billing_mobile", value: mobile },
    ];

    if (transactionId) {
      metaData.push({
        key: "payment_transaction_id",
        value: transactionId,
      });
    }

    const woo = await getWooClient();
    const { data } = await woo.post("/orders", {
      status,
      payment_method: wooPaymentMethod,
      payment_method_title: paymentTitle,
      set_paid: paymentMethod === "upi_paid",
      billing: {
        first_name: customerName,
        last_name: "",
        company: "",
        address_1: address,
        address_2: "",
        city,
        state,
        postcode: pincode,
        country: "IN",
        email,
        phone: mobile,
      },
      shipping: {
        first_name: customerName,
        last_name: "",
        company: "",
        address_1: address,
        address_2: "",
        city,
        state,
        postcode: pincode,
        country: "IN",
        phone: mobile,
      },
      line_items: lineItems,
      fee_lines:
        shippingCharge > 0
          ? [
              {
                name: "Shipping",
                total: shippingCharge.toFixed(2),
              },
            ]
          : [],
      coupon_lines:
        discount > 0
          ? [
              {
                code: "manual-discount",
                discount: discount.toFixed(2),
              },
            ]
          : [],
      customer_note: note,
      meta_data: metaData,
    });
    const result = isRecord(data) ? data : {};

    return privateJson({
      ok: true,
      order: {
        id: result.id,
        number: result.number,
        status: result.status,
        total: result.total,
      },
    });
  } catch (error) {
    logOrderError("create", error);
    return requestErrorResponse(error, "Failed to create order.");
  }
}
