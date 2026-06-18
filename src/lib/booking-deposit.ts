export function calculateDepositNgn(
  itemType: "room" | "tour",
  priceFrom: number,
  nights: number,
  guests: number,
): number {
  if (itemType === "room") {
    return Math.round(priceFrom * nights * 0.2);
  }
  return priceFrom * guests;
}
