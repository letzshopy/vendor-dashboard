// src/app/orders/[id]/page.tsx
import OrderDetailClient from "./OrderDetailClient";
import InvoiceAction from "./InvoiceAction";

export default function Page({ params }: { params: { id: string } }) {
  const id = Number(params.id);

  // Server components can render client components — safe to place the button here.
  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Order #{id}</h1>
        <InvoiceAction id={id} />
      </div>

      <OrderDetailClient id={id} />
    </div>
  );
}
