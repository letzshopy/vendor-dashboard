"use client";
import InvoicePdfClient from "../ui/InvoicePdfClient";

export default function InvoiceAction({ id }: { id: number }) {
  return (
    <button
      className="px-3 py-2 border rounded text-sm"
      onClick={() => InvoicePdfClient.generateForOrders([id])}
    >
      Create PDF Invoice
    </button>
  );
}
