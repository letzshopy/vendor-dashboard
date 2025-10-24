// src/lib/sku.ts
/** Increment the trailing number in a SKU (BK1 -> BK2). If no trailing number, append one. */
export function nextSku(base: string, offset = 1): string {
  const sku = (base || "").trim();
  if (!sku) return String(offset);
  const m = sku.match(/^(\D*?)(\d+)(\D*)$/);
  if (!m) return `${sku}${offset}`;
  const [, prefix, num, suffix] = m;
  const width = num.length;
  const nextNum = (parseInt(num, 10) + offset).toString().padStart(width, "0");
  return `${prefix}${nextNum}${suffix}`;
}

/** Produce a series of SKUs by incrementing the trailing number. */
export function skuSeries(base: string, count: number): string[] {
  const arr: string[] = [];
  for (let i = 1; i <= count; i++) arr.push(nextSku(base, i));
  return arr;
}
