const plnFormatter = new Intl.NumberFormat("pl-PL", {
  style: "currency",
  currency: "PLN",
  maximumFractionDigits: 0,
});

export function formatPln(amount: number): string {
  return plnFormatter.format(amount);
}
