export function calculateDepositNgn(
  priceFrom: number,
  nights: number,
): number {
  return Math.round(priceFrom * nights * 0.2);
}
