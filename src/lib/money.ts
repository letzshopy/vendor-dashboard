export function fmt(amount: string | number, currency = "INR") {
  const n = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-IN", { style: "currency", currency }).format(n || 0);
}
