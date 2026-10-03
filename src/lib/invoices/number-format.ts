/** "RH-{year}-{id}" + 7 → "RH-2026-00007". Pure, so the settings page can preview it. */
export function formatDocumentNumber(
  template: string,
  counter: number,
  padding: number,
  year: number,
): string {
  const id = padding > 0 ? String(counter).padStart(padding, "0") : String(counter);
  return template.replaceAll("{year}", String(year)).replaceAll("{id}", id);
}
