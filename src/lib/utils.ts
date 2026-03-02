// Minimal classnames helper used by the Import/Export UI
export function cn(...parts: Array<string | undefined | null | false>) {
  return parts.filter(Boolean).join(" ");
}
