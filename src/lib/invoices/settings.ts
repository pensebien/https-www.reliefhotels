/**
 * Owner-editable invoice settings (Sirvoy "Invoicing module" parity):
 * numbering format, padding, yearly reset, payment terms, VAT rates for
 * rooms and extras, payee details and footer. Edited at
 * /staff/settings/invoices; stored via settings-store.
 */

import { site } from "@/content/site";
import { readSettingsDoc, writeSettingsDoc } from "@/lib/settings-store";
import { z } from "zod";

const format = z
  .string()
  .trim()
  .min(4)
  .max(40)
  .refine((f) => f.includes("{id}"), { message: "Number format must include {id}" });

export const invoiceSettingsSchema = z.object({
  /** Tokens: {id} counter, {year}. */
  invoiceFormat: format,
  creditNoteFormat: format,
  /** Zero-pad {id} to this many digits (0 = none). */
  padding: z.number().int().min(0).max(8),
  /** Restart counters at 1 every calendar year. */
  resetYearly: z.boolean(),
  /** 0 = due on receipt. */
  paymentTermsDays: z.number().int().min(0).max(90),
  /** VAT already included in room and extra prices, shown backed out. */
  roomVatPct: z.number().min(0).max(100),
  extrasVatPct: z.number().min(0).max(100),
  payeeName: z.string().trim().min(1).max(120),
  payeeAddress: z.string().trim().max(300),
  /** Tax identification number shown on invoices. */
  payeeTaxId: z.string().trim().max(40),
  bankDetails: z.string().trim().max(300),
  footer: z.string().trim().max(500),
});

export type InvoiceSettings = z.infer<typeof invoiceSettingsSchema>;

export const DEFAULT_INVOICE_SETTINGS: InvoiceSettings = {
  invoiceFormat: "RH-{year}-{id}",
  creditNoteFormat: "CN-{year}-{id}",
  padding: 5,
  resetYearly: true,
  paymentTermsDays: 0,
  roomVatPct: 0,
  extrasVatPct: 0,
  payeeName: site.name,
  payeeAddress: site.address.full,
  payeeTaxId: "",
  bankDetails: "",
  footer: "Thank you for staying with us.",
};

export function normalizeInvoiceSettings(raw: unknown): InvoiceSettings {
  const merged = { ...DEFAULT_INVOICE_SETTINGS, ...(raw && typeof raw === "object" ? raw : {}) };
  const parsed = invoiceSettingsSchema.safeParse(merged);
  return parsed.success ? parsed.data : DEFAULT_INVOICE_SETTINGS;
}

const KEY = "invoice_settings";

export function getInvoiceSettings(): Promise<InvoiceSettings> {
  return readSettingsDoc(KEY, normalizeInvoiceSettings);
}

export async function saveInvoiceSettings(input: unknown): Promise<InvoiceSettings> {
  const parsed = invoiceSettingsSchema.safeParse(input);
  if (!parsed.success) {
    throw new InvoiceSettingsValidationError(parsed.error.issues.map((i) => i.message));
  }
  return writeSettingsDoc(KEY, parsed.data);
}

export class InvoiceSettingsValidationError extends Error {
  constructor(readonly issues: string[]) {
    super(issues.join("; "));
  }
}

/** "RH-{year}-{id}" + 7 → "RH-2026-00007". */
export function formatDocumentNumber(
  template: string,
  counter: number,
  padding: number,
  year: number,
): string {
  const id = padding > 0 ? String(counter).padStart(padding, "0") : String(counter);
  return template.replaceAll("{year}", String(year)).replaceAll("{id}", id);
}
