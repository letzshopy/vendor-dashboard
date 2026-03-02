export type CsvPreview = { headers: string[]; rows: string[][] };
export type CsvDelimiter = "," | ";" | "\t" | "|";

export function detectDelimiter(sample: string): CsvDelimiter {
  const candidates: CsvDelimiter[] = [",", ";", "\t", "|"];
  let best: CsvDelimiter = ",";
  let bestScore = -1;
  for (const d of candidates) {
    const lines = sample.split(/\r?\n/).slice(0, 20);
    const counts = lines.map((l) => l.split(d).length);
    const mean = counts.reduce((a, b) => a + b, 0) / Math.max(1, counts.length);
    // choose the delimiter with highest consistent column count
    const variance =
      counts.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / Math.max(1, counts.length);
    const score = mean - variance; // crude heuristic
    if (score > bestScore) {
      bestScore = score;
      best = d;
    }
  }
  return best;
}

export function parseCsvPreview(text: string, delimiter: CsvDelimiter, limit = 50): CsvPreview {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").filter((l) => l.trim() !== "");
  if (lines.length === 0) return { headers: [], rows: [] };
  const headers = splitRow(lines[0], delimiter);
  const rows: string[][] = [];
  for (let i = 1; i < Math.min(lines.length, limit + 1); i++) {
    rows.push(splitRow(lines[i], delimiter));
  }
  return { headers, rows };
}

export function parseCsvFull(text: string, delimiter: string) {
  // support \t literal
  const d = delimiter === "\\t" ? "\t" : delimiter;
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const clean = lines.filter((l) => l.trim() !== "");
  const headers = clean.length ? splitRow(clean[0], d) : [];
  const rows: string[][] = [];
  for (let i = 1; i < clean.length; i++) rows.push(splitRow(clean[i], d));
  return { headers, rows };
}

function splitRow(row: string, delimiter: string): string[] {
  // Simple CSV splitter with quote support
  const d = delimiter === "\\t" ? "\t" : delimiter;
  const out: string[] = [];
  let cur = "";
  let quoted = false;

  for (let i = 0; i < row.length; i++) {
    const ch = row[i];
    if (ch === '"') {
      if (quoted && row[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        quoted = !quoted;
      }
    } else if (ch === d && !quoted) {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

export function stringifyCsvRows(rows: (string | number | null)[][]): string {
  const esc = (v: string | number | null) => {
    const s = v == null ? "" : String(v);
    if (/[,"\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  return rows.map((r) => r.map(esc).join(",")).join("\n");
}

export function toBool(v: unknown): boolean {
  if (typeof v === "boolean") return v;
  const s = String(v || "").toLowerCase();
  return s === "1" || s === "true" || s === "yes" || s === "on";
}

export function toCsvURL(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  return URL.createObjectURL(blob);
}
