// src/components/RegionPicker.tsx
"use client";

import { useEffect, useState } from "react";
import * as indiaStatesModule from "@/lib/indiaStates";

type Props = {
  open: boolean;
  value: string[]; // state codes
  onClose: () => void;
  onSave: (codes: string[]) => void;
};

type IndiaState = {
  code: string;
  name: string;
};

type RawState = string | { code?: string; id?: string; value?: string; name?: string; label?: string };
type RawGroup = {
  name: string;
  states: RawState[];
};

// Try to pull groups from whatever the module exports.
// This is forgiving: supports INDIA_GROUPS, GROUPS, or default.
const RAW_GROUPS: RawGroup[] =
  ((indiaStatesModule as any).INDIA_GROUPS as RawGroup[] | undefined) ??
  ((indiaStatesModule as any).GROUPS as RawGroup[] | undefined) ??
  ((indiaStatesModule as any).default as RawGroup[] | undefined) ??
  [];

// Derive a flat list of states from groups and any flat export.
const INDIA_STATES: IndiaState[] = (() => {
  const seen = new Set<string>();
  const out: IndiaState[] = [];

  // First: from any flat export like INDIA_STATES
  const flat = ((indiaStatesModule as any).INDIA_STATES ?? []) as RawState[];
  for (const s of flat) {
    if (typeof s === "string") {
      if (!seen.has(s)) {
        seen.add(s);
        out.push({ code: s, name: s });
      }
    } else if (s && typeof s === "object") {
      const code = (s.code ?? s.id ?? s.value) as string | undefined;
      if (!code || seen.has(code)) continue;
      seen.add(code);
      out.push({
        code,
        name: (s.name ?? s.label ?? code) as string,
      });
    }
  }

  // Then: fill in any missing from the groups
  for (const group of RAW_GROUPS as any[]) {
    const states = (group?.states ?? []) as RawState[];
    for (const s of states) {
      if (typeof s === "string") {
        if (!seen.has(s)) {
          seen.add(s);
          out.push({ code: s, name: s });
        }
      } else if (s && typeof s === "object") {
        const code = (s.code ?? s.id ?? s.value) as string | undefined;
        if (!code || seen.has(code)) continue;
        seen.add(code);
        out.push({
          code,
          name: (s.name ?? s.label ?? code) as string,
        });
      }
    }
  }

  return out;
})();

export default function RegionPicker({ open, value, onClose, onSave }: Props) {
  const [temp, setTemp] = useState<string[]>(value);

  // When dialog opens, reset temp selection to current value
  useEffect(() => {
    if (open) setTemp(value);
  }, [open, value]);

  const toggle = (code: string) =>
    setTemp((curr) =>
      curr.includes(code) ? curr.filter((c) => c !== code) : [...curr, code]
    );

  const allSelectedIn = (codes: string[]) => codes.every((c) => temp.includes(c));
  const someSelectedIn = (codes: string[]) => codes.some((c) => temp.includes(c));

  const toggleGroup = (codes: string[]) => {
    if (allSelectedIn(codes)) {
      setTemp((curr) => curr.filter((c) => !codes.includes(c)));
    } else {
      setTemp((curr) => Array.from(new Set([...curr, ...codes])));
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-[720px] max-h-[80vh] overflow-hidden rounded-lg bg-white p-4 shadow-lg">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-lg font-medium">Select regions</div>
          <button className="px-2 py-1 text-sm" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="max-h-[60vh] space-y-4 overflow-auto rounded border p-3">
          {RAW_GROUPS.map((g) => {
            const codes = (g.states ?? []) as RawState[];

            // Convert RawState[] → string[] of codes
            const codeList: string[] = codes
              .map((s) =>
                typeof s === "string"
                  ? s
                  : ((s.code ?? s.id ?? s.value) as string | undefined)
              )
              .filter((c): c is string => !!c);

            const all = allSelectedIn(codeList);
            const some = someSelectedIn(codeList) && !all;

            return (
              <div key={g.name}>
                <label className="flex items-center gap-2 font-medium">
                  <input
                    type="checkbox"
                    checked={all}
                    ref={(el) => {
                      if (el) {
                        (el as HTMLInputElement).indeterminate = some;
                      }
                    }}
                    onChange={() => toggleGroup(codeList)}
                  />
                  {g.name}
                </label>
                <div className="mt-2 grid grid-cols-2 gap-2 pl-6 sm:grid-cols-3">
                  {INDIA_STATES.filter((s) => codeList.includes(s.code)).map((s) => (
                    <label key={s.code} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={temp.includes(s.code)}
                        onChange={() => toggle(s.code)}
                      />
                      {s.name}
                    </label>
                  ))}
                </div>
              </div>
            );
          })}

          {RAW_GROUPS.length === 0 && (
            <div className="text-sm text-slate-500">
              No region groups defined. Please check <code>indiaStates.ts</code>.
            </div>
          )}
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button className="rounded border px-3 py-1" onClick={onClose}>
            Cancel
          </button>
          <button
            className="rounded bg-blue-600 px-3 py-1 text-white"
            onClick={() => {
              onSave(temp);
              onClose();
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
