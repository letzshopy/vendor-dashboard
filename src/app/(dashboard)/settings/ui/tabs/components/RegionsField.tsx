"use client";

import { useMemo, useState } from "react";
import { INDIA_STATE_GROUPS, stateName } from "@/lib/indiaStates";

// helpers
const safeUpper = (v: unknown) => String(v ?? "").toUpperCase();
const safeStateName = (code: unknown) => stateName(safeUpper(code));

type RegionsFieldProps = {
  /** two-letter state codes; [] means everywhere in India */
  value: string[];
  onChange: (codes: string[]) => void;
  className?: string;
};

export default function RegionsField({
  value,
  onChange,
  className,
}: RegionsFieldProps) {
  const normalized = useMemo(() => value.map(safeUpper), [value]);
  const [open, setOpen] = useState(false);
  const selected = useMemo(() => new Set(normalized), [normalized]);

  const summary = useMemo(() => {
    if (!normalized.length) return "All India (everywhere)";
    const names = normalized
      .slice(0, 3)
      .map(safeStateName)
      .join(", ");
    const more =
      normalized.length > 3 ? ` +${normalized.length - 3} more` : "";
    return `${normalized.length} state${
      normalized.length > 1 ? "s" : ""
    } selected — ${names}${more}`;
  }, [normalized]);

  return (
    <div className={className}>
      <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2.5">
        <div className="flex flex-col">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Regions
          </span>
          <span className="text-xs text-slate-700">{summary}</span>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
        >
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Select regions
        </button>
      </div>

      {open && (
        <RegionPickerModal
          initial={selected}
          onClose={() => setOpen(false)}
          onSave={(codes) => {
            const sorted = Array.from(codes)
              .map(safeUpper)
              .filter(Boolean)
              .sort((a, b) =>
                safeStateName(a).localeCompare(safeStateName(b))
              );
            onChange(sorted);
            setOpen(false);
          }}
        />
      )}
    </div>
  );
}

function RegionPickerModal({
  initial,
  onClose,
  onSave,
}: {
  initial: Set<string>;
  onClose: () => void;
  onSave: (codes: Set<string>) => void;
}) {
  const [local, setLocal] = useState<Set<string>>(
    new Set(Array.from(initial).map(safeUpper))
  );

  // normalize a group's states into [{code,label}]
  const groupItems = (
    gStates: Array<string | { code: string; name?: string }>
  ) =>
    gStates.map((s) => {
      if (typeof s === "string")
        return { code: safeUpper(s), label: safeStateName(s) };
      const code = safeUpper(s.code);
      return { code, label: s.name || safeStateName(code) };
    });

  const groupCodes = (gStates: Array<string | { code: string }>) =>
    gStates.map((s) =>
      typeof s === "string" ? safeUpper(s) : safeUpper(s.code)
    );

  const toggle = (code: string, checked: boolean) => {
    const c = safeUpper(code);
    const next = new Set(local);
    if (checked) next.add(c);
    else next.delete(c);
    setLocal(next);
  };

  const groupAllChecked = (codes: string[]) =>
    codes.every((c) => local.has(safeUpper(c)));
  const groupAnyChecked = (codes: string[]) =>
    codes.some((c) => local.has(safeUpper(c)));

  const toggleGroup = (codes: string[], checked: boolean) => {
    const next = new Set(local);
    codes.forEach((c) =>
      checked ? next.add(safeUpper(c)) : next.delete(safeUpper(c))
    );
    setLocal(next);
  };

  const allClear = local.size === 0;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-[61] w-[95vw] max-w-[760px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Select regions
            </h2>
            <p className="text-[11px] text-slate-500">
              Leave everything <span className="italic">unchecked</span>{" "}
              to apply shipping to <span className="font-medium">
                all Indian states
              </span>
              .
            </p>
          </div>
          <button
            onClick={onClose}
            className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-xs text-slate-500 hover:bg-slate-100"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[60vh] overflow-auto p-4 space-y-4">
          {INDIA_STATE_GROUPS.map((g) => {
            const groupLabel =
              (g as any).name ??
              (g as any).label ??
              (g as any).title ??
              "Region";

            const items = groupItems((g as any).states as any);
            const codes = items.map((i) => i.code);
            const all = groupAllChecked(codes);
            const some = groupAnyChecked(codes);

            return (
              <div
                key={groupLabel}
                className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50/80"
              >
                {/* Group header */}
                <div className="flex items-center justify-between border-b border-slate-200 bg-slate-100/80 px-3 py-2.5">
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                    <input
                      type="checkbox"
                      className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      checked={all}
                      ref={(el) => {
                        if (!el) return;
                        el.indeterminate = !all && some;
                      }}
                      onChange={(e) =>
                        toggleGroup(codes, e.target.checked)
                      }
                    />
                    <span>{groupLabel}</span>
                  </label>
                  <button
                    type="button"
                    className="text-[11px] text-slate-500 hover:text-slate-700"
                    onClick={() => toggleGroup(codes, false)}
                  >
                    Clear group
                  </button>
                </div>

                {/* States */}
                <div className="grid grid-cols-2 gap-x-6 gap-y-1 p-3">
                  {items.map(({ code, label }) => (
                    <label
                      key={code}
                      className="flex items-center gap-2 rounded-md px-1.5 py-1 text-xs text-slate-700 hover:bg-white"
                    >
                      <input
                        type="checkbox"
                        className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        checked={local.has(code)}
                        onChange={(e) =>
                          toggle(code, e.target.checked)
                        }
                      />
                      <span className="truncate">{label}</span>
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
          <div className="text-[11px] text-slate-500">
            {allClear
              ? "All India selected (no state filters)."
              : `${local.size} state${
                  local.size > 1 ? "s" : ""
                } selected`}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={() => onSave(local)}
              className="inline-flex items-center rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-indigo-700"
            >
              Save regions
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
