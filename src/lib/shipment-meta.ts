export const SHIPMENT_META_KEYS = {
  mode: "_letz_ship_mode",
  courier: "_letz_ship_courier",
  awb: "_letz_ship_awb",
  status: "_letz_ship_status",
  shippedDate: "_letz_ship_shipped_date",
  weight: "_letz_ship_weight",
  boxes: "_letz_ship_boxes",
  notes: "_letz_ship_notes",
} as const;

export type ShipmentMode = "" | "shift" | "self";

export type ShipmentDetails = {
  mode: ShipmentMode;
  courier: string;
  awb: string;
  status: "pending" | "packed" | "shipped" | "delivered" | "returned" | "";
  shippedDate: string;
  weight: string;
  boxes: string;
  notes: string;
};

export function emptyShipmentDetails(): ShipmentDetails {
  return {
    mode: "",
    courier: "",
    awb: "",
    status: "",
    shippedDate: "",
    weight: "",
    boxes: "",
    notes: "",
  };
}

export function extractShipmentFromMeta(
  meta: any[] | undefined | null
): ShipmentDetails {
  const m = Array.isArray(meta) ? meta : [];

  const get = (key: string) => {
    const found = m.find((row: any) => row?.key === key);
    return (found?.value ?? "").toString();
  };

  return {
    mode: get(SHIPMENT_META_KEYS.mode) as ShipmentMode,
    courier: get(SHIPMENT_META_KEYS.courier),
    awb: get(SHIPMENT_META_KEYS.awb),
    status: get(SHIPMENT_META_KEYS.status) as ShipmentDetails["status"],
    shippedDate: get(SHIPMENT_META_KEYS.shippedDate),
    weight: get(SHIPMENT_META_KEYS.weight),
    boxes: get(SHIPMENT_META_KEYS.boxes),
    notes: get(SHIPMENT_META_KEYS.notes),
  };
}

export function mergeShipmentMeta(
  existingMeta: any[] | undefined,
  patch: Partial<ShipmentDetails>
) {
  const meta = Array.isArray(existingMeta) ? existingMeta : [];

  const shipmentKeys = new Set(Object.values(SHIPMENT_META_KEYS));
  const filtered = meta.filter((row: any) => !shipmentKeys.has(row?.key));

  const current = {
    ...emptyShipmentDetails(),
    ...extractShipmentFromMeta(meta),
    ...patch,
  };

  const newEntries = [
    { key: SHIPMENT_META_KEYS.mode, value: current.mode ?? "" },
    { key: SHIPMENT_META_KEYS.courier, value: current.courier ?? "" },
    { key: SHIPMENT_META_KEYS.awb, value: current.awb ?? "" },
    { key: SHIPMENT_META_KEYS.status, value: current.status ?? "" },
    { key: SHIPMENT_META_KEYS.shippedDate, value: current.shippedDate ?? "" },
    { key: SHIPMENT_META_KEYS.weight, value: current.weight ?? "" },
    { key: SHIPMENT_META_KEYS.boxes, value: current.boxes ?? "" },
    { key: SHIPMENT_META_KEYS.notes, value: current.notes ?? "" },
  ];

  return [...filtered, ...newEntries];
}
