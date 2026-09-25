import {
  Truck,
} from "lucide-react";

import {
  PageHeader,
} from "@/components/ui/page-header";
import type {
  WCOrder,
} from "@/lib/order-utils";
import {
  getWooClient,
} from "@/lib/woo";

import ShipmentDetailsBulkTable from "./ShipmentDetailsBulkTable";

async function loadAllOrders(): Promise<
  WCOrder[]
> {
  const woo =
    await getWooClient();

  const perPage = 100;
  const all:
    WCOrder[] = [];
  let page = 1;

  while (page <= 5) {
    const {
      data,
    } =
      await woo.get<
        WCOrder[]
      >("/orders", {
        params: {
          status: "any",
          per_page:
            perPage,
          page,
          orderby:
            "date",
          order: "desc",
        },
      });

    const batch:
      WCOrder[] =
      Array.isArray(data)
        ? data
        : [];

    if (
      batch.length === 0
    ) {
      break;
    }

    all.push(
      ...batch
    );

    if (
      batch.length <
      perPage
    ) {
      break;
    }

    page += 1;
  }

  return all;
}

export default async function ShipmentDetailsPage() {
  const orders =
    await loadAllOrders();

  return (
    <main className="mx-auto w-full min-w-0 max-w-7xl pb-28 md:pb-8">
      <PageHeader
        className="hidden md:flex"
        eyebrow="Sales"
        icon={Truck}
        title="Shipment Details"
        description="Add courier and tracking details for paid orders that are ready to ship."
      />

      <div className="md:mt-5">
        <ShipmentDetailsBulkTable
          initialOrders={
            orders
          }
        />
      </div>
    </main>
  );
}
