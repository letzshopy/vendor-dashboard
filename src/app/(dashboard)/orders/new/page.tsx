"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type ProductSearchItem = {
  id: number;
  name: string;
  sku?: string;
  price?: string;
  regular_price?: string;
  sale_price?: string;
  image?: string;
};

type ProductRow = {
  rowId: string;
  productId: number | null;
  name: string;
  sku?: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
  search: string;
  results: ProductSearchItem[];
  searching: boolean;
  open: boolean;
};

type PaymentMethod = "cod" | "upi_paid" | "payment_pending";

function makeRow(): ProductRow {
  return {
    rowId: crypto.randomUUID(),
    productId: null,
    name: "",
    sku: "",
    qty: 1,
    unitPrice: 0,
    lineTotal: 0,
    search: "",
    results: [],
    searching: false,
    open: false,
  };
}

function moneyToNumber(value: string | number | null | undefined): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (!value) return 0;
  const n = parseFloat(String(value).replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export default function CreateOrderPage() {
  const router = useRouter();
  const searchTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>("");

  const [customerName, setCustomerName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [address1, setAddress1] = useState("");
  const [city, setCity] = useState("");
  const [stateName, setStateName] = useState("");
  const [pincode, setPincode] = useState("");

  const [rows, setRows] = useState<ProductRow[]>([makeRow()]);

  const [shippingCharge, setShippingCharge] = useState("0");
  const [discount, setDiscount] = useState("0");
  const [orderNote, setOrderNote] = useState("");

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cod");
  const [transactionId, setTransactionId] = useState("");

  const shippingValue = useMemo(() => moneyToNumber(shippingCharge), [shippingCharge]);
  const discountValue = useMemo(() => moneyToNumber(discount), [discount]);

  const itemsSubtotal = useMemo(() => {
    return rows.reduce((sum, row) => sum + row.lineTotal, 0);
  }, [rows]);

  const grandTotal = useMemo(() => {
    return Math.max(0, itemsSubtotal + shippingValue - discountValue);
  }, [itemsSubtotal, shippingValue, discountValue]);

  function updateRow(rowId: string, patch: Partial<ProductRow>) {
    setRows((prev) =>
      prev.map((row) => {
        if (row.rowId !== rowId) return row;
        const next = { ...row, ...patch };
        next.lineTotal = Number((next.qty * next.unitPrice).toFixed(2));
        return next;
      })
    );
  }

  function addRow() {
    setRows((prev) => [...prev, makeRow()]);
  }

  function removeRow(rowId: string) {
    if (searchTimers.current[rowId]) {
      clearTimeout(searchTimers.current[rowId]);
      delete searchTimers.current[rowId];
    }

    setRows((prev) => {
      if (prev.length === 1) return prev;
      return prev.filter((row) => row.rowId !== rowId);
    });
  }

  async function searchProducts(rowId: string, query: string) {
    const trimmed = query.trim();

    if (!trimmed) {
      updateRow(rowId, {
        results: [],
        searching: false,
        open: false,
      });
      return;
    }

    updateRow(rowId, {
      searching: true,
      open: true,
    });

    try {
      const res = await fetch(
        `/api/products/search?q=${encodeURIComponent(trimmed)}`,
        { cache: "no-store" }
      );

      const data = await res.json();
      const results = Array.isArray(data?.results) ? data.results : [];

      updateRow(rowId, {
        results,
        searching: false,
        open: true,
      });
    } catch {
      updateRow(rowId, {
        results: [],
        searching: false,
        open: true,
      });
    }
  }

  function scheduleSearch(rowId: string, query: string) {
    if (searchTimers.current[rowId]) {
      clearTimeout(searchTimers.current[rowId]);
    }

    searchTimers.current[rowId] = setTimeout(() => {
      searchProducts(rowId, query);
    }, 300);
  }

  function selectProduct(rowId: string, item: ProductSearchItem) {
    if (searchTimers.current[rowId]) {
      clearTimeout(searchTimers.current[rowId]);
      delete searchTimers.current[rowId];
    }

    const price = moneyToNumber(
      item.sale_price || item.price || item.regular_price || "0"
    );

    updateRow(rowId, {
      productId: item.id,
      name: item.name,
      sku: item.sku || "",
      search: item.name,
      unitPrice: price,
      qty: 1,
      lineTotal: price,
      results: [],
      open: false,
      searching: false,
    });
  }

  function validateForm(): string | null {
    if (!customerName.trim()) return "Customer name is required.";
    if (!mobile.trim()) return "Mobile number is required.";
    if (!address1.trim()) return "Address line 1 is required.";
    if (!city.trim()) return "City is required.";
    if (!stateName.trim()) return "State is required.";
    if (!pincode.trim()) return "Pincode is required.";

    const validRows = rows.filter((r) => r.productId && r.qty > 0);
    if (validRows.length === 0) return "Please select at least one product.";

    for (const row of validRows) {
      if (!row.productId) return "Each row must have a selected product.";
      if (row.qty <= 0) return "Quantity must be at least 1.";
    }

    if (paymentMethod === "upi_paid" && !transactionId.trim()) {
      return "Transaction ID / UTR is required for UPI Paid.";
    }

    return null;
  }

  async function handleCreateOrder() {
    setError("");

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    const payload = {
      customer: {
        name: customerName.trim(),
        mobile: mobile.trim(),
        email: email.trim(),
        address1: address1.trim(),
        city: city.trim(),
        state: stateName.trim(),
        pincode: pincode.trim(),
      },
      items: rows
        .filter((r) => r.productId && r.qty > 0)
        .map((r) => ({
          product_id: r.productId,
          quantity: r.qty,
          unit_price: r.unitPrice,
        })),
      charges: {
        shipping: shippingValue,
        discount: discountValue,
      },
      payment: {
        method: paymentMethod,
        transaction_id: transactionId.trim(),
      },
      note: orderNote.trim(),
    };

    setSaving(true);

    try {
      const res = await fetch("/api/orders/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to create order.");
      }

      const orderId = data?.order?.id;
      if (!orderId) {
        throw new Error("Order created, but order ID was not returned.");
      }

      router.push(`/orders/${orderId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create order.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="p-4 md:p-6 max-w-6xl mx-auto">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Create Manual Order</h1>
          <p className="text-sm text-gray-500 mt-1">
            Create a WooCommerce order from the dashboard.
          </p>
        </div>

        <Link
          href="/orders"
          className="inline-flex items-center rounded-xl border px-4 py-2 text-sm font-medium hover:bg-gray-50"
        >
          Back to Orders
        </Link>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <section className="xl:col-span-2 space-y-6">
          <div className="rounded-2xl border bg-white p-5">
            <h2 className="text-lg font-semibold mb-4">Customer Details</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Customer Name *</label>
                <input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full rounded-xl border px-3 py-2"
                  placeholder="Enter customer name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Mobile Number *</label>
                <input
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  className="w-full rounded-xl border px-3 py-2"
                  placeholder="Enter mobile number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border px-3 py-2"
                  placeholder="Enter email (optional)"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Address Line 1 *</label>
                <input
                  value={address1}
                  onChange={(e) => setAddress1(e.target.value)}
                  className="w-full rounded-xl border px-3 py-2"
                  placeholder="House / street / area"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">City *</label>
                <input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full rounded-xl border px-3 py-2"
                  placeholder="City"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">State *</label>
                <input
                  value={stateName}
                  onChange={(e) => setStateName(e.target.value)}
                  className="w-full rounded-xl border px-3 py-2"
                  placeholder="State"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Pincode *</label>
                <input
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                  className="w-full rounded-xl border px-3 py-2"
                  placeholder="Pincode"
                />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border bg-white p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Products</h2>
              <button
                type="button"
                onClick={addRow}
                className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-gray-50"
              >
                + Add Product
              </button>
            </div>

            <div className="space-y-4">
              {rows.map((row, index) => (
                <div key={row.rowId} className="rounded-2xl border p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="text-sm font-medium">Product Row {index + 1}</div>
                    <button
                      type="button"
                      onClick={() => removeRow(row.rowId)}
                      className="text-sm text-red-600 hover:underline"
                    >
                      Remove
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                    <div className="md:col-span-6 relative">
                      <label className="block text-sm font-medium mb-1">
                        Search Product *
                      </label>
                      <input
                        value={row.search}
                        onChange={(e) => {
                          const value = e.target.value;

                          updateRow(row.rowId, {
                            search: value,
                            productId: null,
                            name: "",
                            sku: "",
                            unitPrice: 0,
                            lineTotal: 0,
                            results: value.trim() ? row.results : [],
                            open: !!value.trim(),
                          });

                          scheduleSearch(row.rowId, value);
                        }}
                        onFocus={() => {
                          if (row.search.trim()) {
                            updateRow(row.rowId, { open: true });
                            if (!row.results.length) {
                              scheduleSearch(row.rowId, row.search);
                            }
                          }
                        }}
                        className="w-full rounded-xl border px-3 py-2"
                        placeholder="Search by product name or SKU"
                      />

                      {row.open && (
                        <div className="absolute z-20 mt-2 w-full rounded-xl border bg-white shadow-lg max-h-64 overflow-auto">
                          {row.searching ? (
                            <div className="px-3 py-2 text-sm text-gray-500">Searching...</div>
                          ) : row.results.length > 0 ? (
                            row.results.map((item) => (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => selectProduct(row.rowId, item)}
                                className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b last:border-b-0"
                              >
                                <div className="text-sm font-medium">{item.name}</div>
                                <div className="text-xs text-gray-500">
                                  SKU: {item.sku || "-"}
                                </div>
                              </button>
                            ))
                          ) : row.search.trim() ? (
                            <div className="px-3 py-2 text-sm text-gray-500">
                              No products found.
                            </div>
                          ) : null}
                        </div>
                      )}
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium mb-1">Qty *</label>
                      <input
                        type="number"
                        min={1}
                        value={row.qty}
                        onChange={(e) =>
                          updateRow(row.rowId, {
                            qty: Math.max(1, Number(e.target.value || 1)),
                          })
                        }
                        className="w-full rounded-xl border px-3 py-2"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium mb-1">Unit Price</label>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={row.unitPrice}
                        onChange={(e) =>
                          updateRow(row.rowId, {
                            unitPrice: Math.max(0, Number(e.target.value || 0)),
                          })
                        }
                        className="w-full rounded-xl border px-3 py-2"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium mb-1">Line Total</label>
                      <input
                        value={row.lineTotal.toFixed(2)}
                        readOnly
                        className="w-full rounded-xl border bg-gray-50 px-3 py-2"
                      />
                    </div>
                  </div>

                  {row.productId ? (
                    <div className="mt-3 text-xs text-gray-500">
                      Selected: #{row.productId} {row.name} {row.sku ? `• SKU: ${row.sku}` : ""}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border bg-white p-5">
            <h2 className="text-lg font-semibold mb-4">Charges & Notes</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Shipping Charge</label>
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  value={shippingCharge}
                  onChange={(e) => setShippingCharge(e.target.value)}
                  className="w-full rounded-xl border px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Discount</label>
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  className="w-full rounded-xl border px-3 py-2"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Order Note</label>
                <textarea
                  value={orderNote}
                  onChange={(e) => setOrderNote(e.target.value)}
                  className="w-full rounded-xl border px-3 py-2 min-h-28"
                  placeholder="Optional internal or customer note"
                />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border bg-white p-5">
            <h2 className="text-lg font-semibold mb-4">Payment</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Payment Method *</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full rounded-xl border px-3 py-2"
                >
                  <option value="cod">COD</option>
                  <option value="upi_paid">UPI Paid</option>
                  <option value="payment_pending">Payment Pending</option>
                </select>
              </div>

              {(paymentMethod === "upi_paid" || paymentMethod === "payment_pending") && (
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Transaction ID / UTR {paymentMethod === "upi_paid" ? "*" : ""}
                  </label>
                  <input
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    className="w-full rounded-xl border px-3 py-2"
                    placeholder="Enter transaction reference"
                  />
                </div>
              )}
            </div>
          </div>
        </section>

        <aside className="xl:col-span-1">
          <div className="sticky top-6 rounded-2xl border bg-white p-5">
            <h2 className="text-lg font-semibold mb-4">Order Summary</h2>

            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span>Items Subtotal</span>
                <span>₹{itemsSubtotal.toFixed(2)}</span>
              </div>

              <div className="flex items-center justify-between">
                <span>Shipping</span>
                <span>₹{shippingValue.toFixed(2)}</span>
              </div>

              <div className="flex items-center justify-between">
                <span>Discount</span>
                <span>- ₹{discountValue.toFixed(2)}</span>
              </div>

              <div className="border-t pt-3 flex items-center justify-between text-base font-semibold">
                <span>Total</span>
                <span>₹{grandTotal.toFixed(2)}</span>
              </div>
            </div>

            {error ? (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            <button
              type="button"
              onClick={handleCreateOrder}
              disabled={saving}
              className="mt-5 w-full rounded-xl bg-black text-white px-4 py-3 text-sm font-medium disabled:opacity-60"
            >
              {saving ? "Creating Order..." : "Create Order"}
            </button>
          </div>
        </aside>
      </div>
    </main>
  );
}