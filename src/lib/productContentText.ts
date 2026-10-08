const ENTITY_MAP: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  "#39": "'",
  nbsp: " ",
};

function decodeHtmlEntitiesOnce(value: string): string {
  return value
    .replace(/&#(\d+);/g, (_, raw: string) => {
      const code = Number(raw);
      return Number.isFinite(code)
        ? String.fromCodePoint(code)
        : _;
    })
    .replace(/&#x([0-9a-f]+);/gi, (_, raw: string) => {
      const code = Number.parseInt(raw, 16);
      return Number.isFinite(code)
        ? String.fromCodePoint(code)
        : _;
    })
    .replace(/&(amp|lt|gt|quot|apos|#39|nbsp);/gi, (match, name: string) => {
      return ENTITY_MAP[name.toLowerCase()] ?? match;
    });
}

export function productContentText(value: string | null | undefined): string {
  if (!value) return "";

  let text = value;

  // WooCommerce content can arrive HTML-encoded more than once.
  for (let pass = 0; pass < 2; pass += 1) {
    text = decodeHtmlEntitiesOnce(text);
  }

  return text
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<li\b[^>]*>/gi, "• ")
    .replace(/<\/(?:p|div|li|h[1-6]|section|article|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
