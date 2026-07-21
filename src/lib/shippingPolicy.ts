import {
  ALL_STATE_CODES,
  normalizeIndiaStateCode,
} from "@/lib/indiaStates";

type JsonRecord = Record<string, unknown>;

export type ShippingClassInput = {
  name: string;
  slug: string;
};

type ShippingSlab = {
  uptoKg: number;
  price: number;
};

type ShippingOverride = {
  category: {
    id: number;
    slug: string;
    name: string;
  };
  slabs: ShippingSlab[];
};

export type ShippingZoneInput = {
  name: string;
  regions: string[];
  methods: {
    free: {
      enabled: boolean;
      scope: "all" | "category";
      categories: number[];
    };
    weight: {
      enabled: boolean;
      step: 0.5 | 1;
      slabs: ShippingSlab[];
      overrides: ShippingOverride[];
    };
  };
};

const VALID_INDIA_STATE_CODES = new Set<string>([
  ...ALL_STATE_CODES,
  // WooCommerce also retains these India codes.
  "DD",
  "DH",
  "LD",
]);

function isRecord(
  value: unknown
): value is JsonRecord {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function strictText(
  value: unknown,
  maxLength: number
): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const text = value.trim();

  return text.length <= maxLength &&
    !/[\u0000-\u001F\u007F]/.test(text)
    ? text
    : null;
}

function validSlug(
  value: string
): boolean {
  return (
    value.length > 0 &&
    value.length <= 160 &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(
      value
    )
  );
}

function positiveInteger(
  value: unknown
): number | null {
  const number = Number(value);

  return Number.isInteger(number) &&
    number > 0
    ? number
    : null;
}

function normalizeSlabs(
  value: unknown
): ShippingSlab[] | null {
  if (!Array.isArray(value)) {
    return [];
  }

  if (value.length > 200) {
    return null;
  }

  const slabs: ShippingSlab[] = [];
  const weights = new Set<number>();

  for (const item of value) {
    if (!isRecord(item)) {
      return null;
    }

    const uptoKg = Number(item.uptoKg);
    const price = Number(item.price);

    if (
      !Number.isFinite(uptoKg) ||
      uptoKg <= 0 ||
      uptoKg > 10_000 ||
      !Number.isFinite(price) ||
      price < 0 ||
      price > 10_000_000 ||
      weights.has(uptoKg)
    ) {
      return null;
    }

    weights.add(uptoKg);
    slabs.push({ uptoKg, price });
  }

  return slabs.sort(
    (left, right) =>
      left.uptoKg - right.uptoKg
  );
}

export function normalizeIndiaShippingRegion(
  value: unknown
): string | null {
  const text = strictText(value, 8);

  if (text === null) {
    return null;
  }

  const code = normalizeIndiaStateCode(text);

  return VALID_INDIA_STATE_CODES.has(code)
    ? code
    : null;
}

export function normalizeShippingClasses(
  value: unknown
): ShippingClassInput[] | null {
  if (
    !Array.isArray(value) ||
    value.length < 1 ||
    value.length > 200
  ) {
    return null;
  }

  const classes: ShippingClassInput[] = [];
  const slugs = new Set<string>();

  for (const item of value) {
    if (!isRecord(item)) {
      return null;
    }

    const name = strictText(
      item.name,
      160
    );
    const rawSlug = strictText(
      item.slug,
      160
    );
    const slug = rawSlug
      ? rawSlug.toLowerCase()
      : "";

    if (
      !name ||
      !validSlug(slug) ||
      slugs.has(slug)
    ) {
      return null;
    }

    slugs.add(slug);
    classes.push({ name, slug });
  }

  return classes;
}

export function normalizeShippingZones(
  value: unknown
): ShippingZoneInput[] | null {
  if (
    !Array.isArray(value) ||
    value.length < 1 ||
    value.length > 50
  ) {
    return null;
  }

  const zones: ShippingZoneInput[] = [];

  for (const item of value) {
    if (!isRecord(item)) {
      return null;
    }

    const name = strictText(
      item.name,
      160
    );

    if (!name) {
      return null;
    }

    const regionValues = Array.isArray(
      item.regions
    )
      ? item.regions
      : [];

    if (regionValues.length > 100) {
      return null;
    }

    const regions: string[] = [];
    const seenRegions = new Set<string>();

    for (const regionValue of regionValues) {
      const region =
        normalizeIndiaShippingRegion(
          regionValue
        );

      if (region === null) {
        return null;
      }

      if (!seenRegions.has(region)) {
        seenRegions.add(region);
        regions.push(region);
      }
    }

    const methods = isRecord(
      item.methods
    )
      ? item.methods
      : {};
    const free = isRecord(methods.free)
      ? methods.free
      : {};
    const weight = isRecord(
      methods.weight
    )
      ? methods.weight
      : {};

    const categoryValues =
      Array.isArray(free.categories)
        ? free.categories
        : [];

    if (categoryValues.length > 500) {
      return null;
    }

    const categories: number[] = [];

    for (const category of categoryValues) {
      const id = positiveInteger(
        category
      );

      if (id === null) {
        return null;
      }

      categories.push(id);
    }

    if (
      new Set(categories).size !==
      categories.length
    ) {
      return null;
    }

    const slabs = normalizeSlabs(
      weight.slabs
    );

    if (slabs === null) {
      return null;
    }

    const overrideValues =
      Array.isArray(weight.overrides)
        ? weight.overrides
        : [];

    if (overrideValues.length > 200) {
      return null;
    }

    const overrides:
      ShippingOverride[] = [];

    for (const overrideValue of
      overrideValues) {
      if (!isRecord(overrideValue)) {
        return null;
      }

      const category = isRecord(
        overrideValue.category
      )
        ? overrideValue.category
        : {};
      const id = positiveInteger(
        category.id
      );
      const rawSlug = strictText(
        category.slug,
        160
      );
      const slug = rawSlug
        ? rawSlug.toLowerCase()
        : "";
      const categoryName = strictText(
        category.name,
        160
      );
      const overrideSlabs =
        normalizeSlabs(
          overrideValue.slabs
        );

      if (
        id === null ||
        !validSlug(slug) ||
        !categoryName ||
        overrideSlabs === null
      ) {
        return null;
      }

      overrides.push({
        category: {
          id,
          slug,
          name: categoryName,
        },
        slabs: overrideSlabs,
      });
    }

    zones.push({
      name,
      regions,
      methods: {
        free: {
          enabled:
            free.enabled === true,
          scope:
            free.scope === "category"
              ? "category"
              : "all",
          categories,
        },
        weight: {
          enabled:
            weight.enabled === true,
          step:
            Number(weight.step) === 0.5
              ? 0.5
              : 1,
          slabs,
          overrides,
        },
      },
    });
  }

  return zones;
}