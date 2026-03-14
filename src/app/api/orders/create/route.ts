import { NextRequest, NextResponse } from "next/server";
import { getWooClient } from "@/lib/woo";

type PaymentMethodInput = "cod" | "upi_paid" | "payment_pending";

type CreateOrderPayload = {
  customer?: {
    name?: string;
    mobile?: string;
    email?: string;
    address1?: string;
    city?: string;
    state?: string;
    pincode?: string;
  };
  items?: Array<{
    product_id?: number;
    quantity?: number;
    unit_price?: number;
  }>;
  charges?: {
    shipping?: number;
    discount?: number;
  };
  payment?: {
    method?: PaymentMethodInput;
    transaction_id?: string;
  };
  note?: string;
};

function cleanString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function cleanNumber(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as CreateOrderPayload;

    const customer = body.customer || {};
    const items = Array.isArray(body.items) ? body.items : [];
    const charges = body.charges || {};
    const payment = body.payment || {};

    const customerName = cleanString(customer.name);
    const mobile = cleanString(customer.mobile);
    const email = cleanString(customer.email);
    const address1 = cleanString(customer.address1);
    const city = cleanString(customer.city);
    const state = cleanString(customer.state);
    const pincode = cleanString(customer.pincode);

    const paymentMethod = (payment.method || "cod") as PaymentMethodInput;
    const transactionId = cleanString(payment.transaction_id);
    const orderNote = cleanString(body.note);

    if (!customerName) {
      return NextResponse.json({ error: "Customer name is required." }, { status: 400 });
    }
    if (!mobile) {
      return NextResponse.json({ error: "Mobile number is required." }, { status: 400 });
    }
    if (!address1) {
      return NextResponse.json({ error: "Address line 1 is required." }, { status: 400 });
    }
    if (!city) {
      return NextResponse.json({ error: "City is required." }, { status: 400 });
    }
    if (!state) {
      return NextResponse.json({ error: "State is required." }, { status: 400 });
    }
    if (!pincode) {
      return NextResponse.json({ error: "Pincode is required." }, { status: 400 });
    }

    const validItems = items
      .map((item) => ({
        product_id: cleanNumber(item.product_id),
        quantity: Math.max(1, cleanNumber(item.quantity)),
        unit_price: Math.max(0, cleanNumber(item.unit_price)),
      }))
      .filter((item) => item.product_id > 0);

    if (validItems.length === 0) {
      return NextResponse.json(
        { error: "At least one valid product is required." },
        { status: 400 }
      );
    }

    if (paymentMethod === "upi_paid" && !transactionId) {
      return NextResponse.json(
        { error: "Transaction ID / UTR is required for UPI Paid." },
        { status: 400 }
      );
    }

    const shippingCharge = Math.max(0, cleanNumber(charges.shipping));
    const discount = Math.max(0, cleanNumber(charges.discount));

    let status = "processing";
    let wcPaymentMethod = "cod";
    let wcPaymentMethodTitle = "Cash on Delivery";

    if (paymentMethod === "upi_paid") {
      status = "processing";
      wcPaymentMethod = "letz_manual_upi";
      wcPaymentMethodTitle = "UPI Paid";
    } else if (paymentMethod === "payment_pending") {
      status = "on-hold";
      wcPaymentMethod = "letz_payment_pending";
      wcPaymentMethodTitle = "Payment Pending";
    }

    const lineItems = validItems.map((item) => ({
      product_id: item.product_id,
      quantity: item.quantity,
      subtotal: item.unit_price.toFixed(2),
      total: item.unit_price.toFixed(2),
    }));

    const feeLines =
      shippingCharge > 0
        ? [
            {
              name: "Shipping",
              total: shippingCharge.toFixed(2),
            },
          ]
        : [];

    const couponLines =
      discount > 0
        ? [
            {
              code: "manual-discount",
              discount: discount.toFixed(2),
            },
          ]
        : [];

    const metaData: Array<{ key: string; value: string }> = [
      { key: "manual_order_source", value: "dashboard" },
      { key: "billing_mobile", value: mobile },
    ];

    if (transactionId) {
      metaData.push({ key: "payment_transaction_id", value: transactionId });
    }

    const woo = await getWooClient();

    const payload = {
      status,
      payment_method: wcPaymentMethod,
      payment_method_title: wcPaymentMethodTitle,
      set_paid: paymentMethod === "upi_paid",
      billing: {
        first_name: customerName,
        last_name: "",
        company: "",
        address_1: address1,
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
        address_1: address1,
        address_2: "",
        city,
        state,
        postcode: pincode,
        country: "IN",
        phone: mobile,
      },
      line_items: lineItems,
      fee_lines: feeLines,
      coupon_lines: couponLines,
      customer_note: orderNote || "",
      meta_data: metaData,
    };

    const { data } = await woo.post("/orders", payload);

    return NextResponse.json({
      ok: true,
      order: {
        id: data?.id,
        number: data?.number,
        status: data?.status,
        total: data?.total,
      },
    });
  } catch (error: any) {
    const message =
      error?.response?.data?.message ||
      error?.message ||
      "Failed to create order.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}