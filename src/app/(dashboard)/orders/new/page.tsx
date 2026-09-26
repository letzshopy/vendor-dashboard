"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ReceiptText } from "lucide-react";

import { AsyncButton } from "@/components/ui/async-button";
import { buttonClassName } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { actionFeedback } from "@/lib/actionFeedback";

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
    if (saving) return;

    setError("");

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      actionFeedback.warning({
        id: "manual-order-validation",
        title: "Complete the required details",
        message: validationError,
        durationMs: 3600,
      });
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

    const feedbackId = "manual-order-create";
    setSaving(true);

    actionFeedback.loading({
      id: feedbackId,
      title: "Creating order…",
      message: customerName.trim(),
    });

    try {
      const res = await fetch("/api/orders/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error || "Failed to create order.");
      }

      const orderId = data?.order?.id;
      if (!orderId) {
        throw new Error("Order created, but order ID was not returned.");
      }

      actionFeedback.success({
        id: feedbackId,
        title: "Order created",
        message: `Order #${data?.order?.number || orderId}`,
        durationMs: 2200,
      });

      window.dispatchEvent(
        new Event("letzshopy:navigation-start")
      );
      router.push(`/orders/${orderId}`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to create order.";

      setError(message);
      actionFeedback.error({
        id: feedbackId,
        title: "Order creation failed",
        message,
        durationMs: 4200,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto w-full min-w-0 max-w-7xl pb-32 md:pb-8">
      <PageHeader
        className="hidden md:flex"
        eyebrow="Orders"
        icon={ReceiptText}
        title="Create Order"
        description="Create a manual customer order with products, charges and payment status."
        actions={
          <Link
            href="/orders"
            className={buttonClassName({
              variant: "outline",
            })}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Orders
          </Link>
        }
      />

      <div className="grid gap-3 md:mt-5 md:gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="space-y-3 md:space-y-4">
          <div className="rounded-xl border border-border bg-card p-3 md:rounded-2xl md:p-4">
            <h2 className="mb-3 text-base font-extrabold text-heading">Customer Details</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Customer Name *</label>
                <input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="ls-focus-ring h-11 w-full rounded-xl border border-input bg-card px-3 text-sm text-foreground shadow-[0_1px_2px_rgba(25,35,75,0.03)] placeholder:text-muted-foreground"
                  placeholder="Enter customer name"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Mobile Number *</label>
                <input
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  className="ls-focus-ring h-11 w-full rounded-xl border border-input bg-card px-3 text-sm text-foreground shadow-[0_1px_2px_rgba(25,35,75,0.03)] placeholder:text-muted-foreground"
                  placeholder="Enter mobile number"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Email</label>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="ls-focus-ring h-11 w-full rounded-xl border border-input bg-card px-3 text-sm text-foreground shadow-[0_1px_2px_rgba(25,35,75,0.03)] placeholder:text-muted-foreground"
                  placeholder="Enter email (optional)"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Address Line 1 *</label>
                <input
                  value={address1}
                  onChange={(e) => setAddress1(e.target.value)}
                  className="ls-focus-ring h-11 w-full rounded-xl border border-input bg-card px-3 text-sm text-foreground shadow-[0_1px_2px_rgba(25,35,75,0.03)] placeholder:text-muted-foreground"
                  placeholder="House / street / area"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">City *</label>
                <input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="ls-focus-ring h-11 w-full rounded-xl border border-input bg-card px-3 text-sm text-foreground shadow-[0_1px_2px_rgba(25,35,75,0.03)] placeholder:text-muted-foreground"
                  placeholder="City"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">State *</label>
                <input
                  value={stateName}
                  onChange={(e) => setStateName(e.target.value)}
                  className="ls-focus-ring h-11 w-full rounded-xl border border-input bg-card px-3 text-sm text-foreground shadow-[0_1px_2px_rgba(25,35,75,0.03)] placeholder:text-muted-foreground"
                  placeholder="State"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Pincode *</label>
                <input
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                  className="ls-focus-ring h-11 w-full rounded-xl border border-input bg-card px-3 text-sm text-foreground shadow-[0_1px_2px_rgba(25,35,75,0.03)] placeholder:text-muted-foreground"
                  placeholder="Pincode"
                />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-3 md:rounded-2xl md:p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Products</h2>
              <button
                type="button"
                onClick={addRow}
                className="ls-focus-ring min-h-10 rounded-xl border border-border bg-card px-3 text-xs font-bold text-foreground hover:bg-muted"
              >
                + Add Product
              </button>
            </div>

            <div className="space-y-4">
              {rows.map((row, index) => (
                <div key={row.rowId} className="rounded-xl border border-border bg-surface-soft p-3">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="text-sm font-bold text-heading">Product Row {index + 1}</div>
                    <button
                      type="button"
                      onClick={() => removeRow(row.rowId)}
                      className="ls-focus-ring rounded-lg px-2 py-1 text-xs font-bold text-destructive hover:bg-destructive/10"
                    >
                      Remove
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                    <div className="md:col-span-6 relative">
                      <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
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
                        className="ls-focus-ring h-11 w-full rounded-xl border border-input bg-card px-3 text-sm text-foreground shadow-[0_1px_2px_rgba(25,35,75,0.03)] placeholder:text-muted-foreground"
                        placeholder="Search by product name or SKU"
                      />

                      {row.open && (
                        <div className="absolute z-30 mt-2 max-h-72 w-full overflow-auto rounded-xl border border-border bg-card shadow-xl">
                          {row.searching ? (
                            <div className="px-3 py-2 text-sm text-gray-500">Searching...</div>
                          ) : row.results.length > 0 ? (
                            row.results.map((item) => (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => selectProduct(row.rowId, item)}
                                className="min-h-14 w-full border-b border-border px-3 py-2.5 text-left last:border-b-0 hover:bg-muted"
                              >
                                <div className="text-sm font-bold text-heading">{item.name}</div>
                                <div className="text-xs text-muted-foreground">
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
                      <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Qty *</label>
                      <input
                        type="number"
                        min={1}
                        value={row.qty}
                        onChange={(e) =>
                          updateRow(row.rowId, {
                            qty: Math.max(1, Number(e.target.value || 1)),
                          })
                        }
                        className="ls-focus-ring h-11 w-full rounded-xl border border-input bg-card px-3 text-sm text-foreground shadow-[0_1px_2px_rgba(25,35,75,0.03)] placeholder:text-muted-foreground"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Unit Price</label>
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
                        className="ls-focus-ring h-11 w-full rounded-xl border border-input bg-card px-3 text-sm text-foreground shadow-[0_1px_2px_rgba(25,35,75,0.03)] placeholder:text-muted-foreground"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Line Total</label>
                      <input
                        value={row.lineTotal.toFixed(2)}
                        readOnly
                        className="h-11 w-full rounded-xl border border-border bg-muted px-3 text-sm font-semibold text-heading"
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

          <div className="rounded-xl border border-border bg-card p-3 md:rounded-2xl md:p-4">
            <h2 className="mb-3 text-base font-extrabold text-heading">Charges & Notes</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Shipping Charge</label>
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  value={shippingCharge}
                  onChange={(e) => setShippingCharge(e.target.value)}
                  className="ls-focus-ring h-11 w-full rounded-xl border border-input bg-card px-3 text-sm text-foreground shadow-[0_1px_2px_rgba(25,35,75,0.03)] placeholder:text-muted-foreground"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Discount</label>
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  className="ls-focus-ring h-11 w-full rounded-xl border border-input bg-card px-3 text-sm text-foreground shadow-[0_1px_2px_rgba(25,35,75,0.03)] placeholder:text-muted-foreground"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Order Note</label>
                <textarea
                  value={orderNote}
                  onChange={(e) => setOrderNote(e.target.value)}
                  className="ls-focus-ring min-h-24 w-full rounded-xl border border-input bg-card px-3 py-3 text-sm text-foreground placeholder:text-muted-foreground"
                  placeholder="Optional internal or customer note"
                />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-3 md:rounded-2xl md:p-4">
            <h2 className="mb-3 text-base font-extrabold text-heading">Payment</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Payment Method *</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="ls-focus-ring h-11 w-full rounded-xl border border-input bg-card px-3 text-sm text-foreground shadow-[0_1px_2px_rgba(25,35,75,0.03)] placeholder:text-muted-foreground"
                >
                  <option value="cod">COD</option>
                  <option value="upi_paid">UPI Paid</option>
                  <option value="payment_pending">Payment Pending</option>
                </select>
              </div>

              {(paymentMethod === "upi_paid" || paymentMethod === "payment_pending") && (
                <div>
                  <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                    Transaction ID / UTR {paymentMethod === "upi_paid" ? "*" : ""}
                  </label>
                  <input
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    className="ls-focus-ring h-11 w-full rounded-xl border border-input bg-card px-3 text-sm text-foreground shadow-[0_1px_2px_rgba(25,35,75,0.03)] placeholder:text-muted-foreground"
                    placeholder="Enter transaction reference"
                  />
                </div>
              )}
            </div>
          </div>
        </section>

        <aside className="hidden xl:block">
          <div className="sticky top-24 rounded-2xl border border-border bg-card p-4">
            <h2 className="mb-3 text-base font-extrabold text-heading">Order Summary</h2>

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

            <AsyncButton
              size="lg"
              className="mt-5 w-full"
              loading={saving}
              loadingLabel="Creating…"
              onClick={handleCreateOrder}
            >
              Create Order
            </AsyncButton>
          </div>
        </aside>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 px-3 pb-[calc(var(--ls-safe-area-bottom)+0.75rem)] pt-2.5 shadow-[0_-10px_30px_rgba(15,23,42,0.08)] backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-7xl items-center gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
              Order Total
            </div>
            <div className="truncate text-lg font-extrabold text-heading">
              ₹{grandTotal.toFixed(2)}
            </div>
          </div>

          <AsyncButton
            size="lg"
            loading={saving}
            loadingLabel="Creating…"
            onClick={handleCreateOrder}
            className="min-w-40"
          >
            Create Order
          </AsyncButton>
        </div>
      </div>
    </main>
  );
}