export type State = { code: string; name: string };
export type StateGroup = {
  id: "south" | "north";
  label: string;
  states: State[];
};

export const LEGACY_INDIA_STATE_CODE_ALIASES: Readonly<
  Record<string, string>
> = {
  KA2: "LA",
  OR: "OD",
  TG: "TS",
  UT: "UK",
};

export const INDIA_STATE_GROUPS: StateGroup[] = [
  {
    id: "south",
    label: "South Region",
    states: [
      { code: "TN", name: "Tamil Nadu" },
      { code: "KA", name: "Karnataka" },
      { code: "KL", name: "Kerala" },
      { code: "TS", name: "Telangana" },
      { code: "AP", name: "Andhra Pradesh" },
      { code: "PY", name: "Puducherry" },
    ],
  },
  {
    id: "north",
    label: "North Region",
    states: [
      { code: "AN", name: "Andaman and Nicobar Islands" },
      { code: "AR", name: "Arunachal Pradesh" },
      { code: "AS", name: "Assam" },
      { code: "BR", name: "Bihar" },
      { code: "CH", name: "Chandigarh" },
      { code: "CT", name: "Chhattisgarh" },
      { code: "DL", name: "Delhi" },
      {
        code: "DN",
        name: "Dadra & Nagar Haveli and Daman & Diu",
      },
      { code: "GA", name: "Goa" },
      { code: "GJ", name: "Gujarat" },
      { code: "HP", name: "Himachal Pradesh" },
      { code: "HR", name: "Haryana" },
      { code: "JH", name: "Jharkhand" },
      { code: "JK", name: "Jammu and Kashmir" },
      { code: "LA", name: "Ladakh" },
      { code: "MH", name: "Maharashtra" },
      { code: "ML", name: "Meghalaya" },
      { code: "MN", name: "Manipur" },
      { code: "MP", name: "Madhya Pradesh" },
      { code: "MZ", name: "Mizoram" },
      { code: "NL", name: "Nagaland" },
      { code: "OD", name: "Odisha" },
      { code: "PB", name: "Punjab" },
      { code: "RJ", name: "Rajasthan" },
      { code: "SK", name: "Sikkim" },
      { code: "TR", name: "Tripura" },
      { code: "UP", name: "Uttar Pradesh" },
      { code: "UK", name: "Uttarakhand" },
      { code: "WB", name: "West Bengal" },
    ],
  },
];

export const ALL_STATE_CODES = INDIA_STATE_GROUPS.flatMap(
  (group) => group.states.map((state) => state.code)
);

export function normalizeIndiaStateCode(value: unknown): string {
  const raw = String(value ?? "").trim().toUpperCase();
  return LEGACY_INDIA_STATE_CODE_ALIASES[raw] ?? raw;
}

export function stateName(code: string) {
  const normalized = normalizeIndiaStateCode(code);
  const state = INDIA_STATE_GROUPS.flatMap(
    (group) => group.states
  ).find((item) => item.code === normalized);

  return state?.name || normalized;
}