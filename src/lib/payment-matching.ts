import { demoPayments } from "@/content/demo-data";
import type { PaymentRecord } from "@/lib/demo-store";
import { isSupabaseEnabled } from "@/lib/db/client";
import { getSupabaseAdmin } from "@/lib/db/client";
import { promises as fs } from "fs";
import path from "path";

const STORE_FILE = path.join(process.cwd(), "data", "demo-store.json");

async function readFilePayments(): Promise<PaymentRecord[]> {
  try {
    const raw = await fs.readFile(STORE_FILE, "utf-8");
    const store = JSON.parse(raw) as { payments?: PaymentRecord[] };
    return store.payments ?? [];
  } catch {
    return [];
  }
}

/** Match incoming transfer webhooks to a pending walk-in transfer payment by amount. */
export async function findPendingTransferPayment(
  amountKobo: number,
): Promise<PaymentRecord | undefined> {
  let payments: PaymentRecord[] = [];

  if (isSupabaseEnabled()) {
    const supabase = getSupabaseAdmin();
    if (supabase) {
      const { data } = await supabase
        .from("payments")
        .select()
        .eq("status", "pending")
        .eq("payment_method", "moniepoint_transfer")
        .eq("amount_kobo", amountKobo)
        .order("created_at", { ascending: false })
        .limit(1);
      if (data?.[0]) {
        return {
          id: data[0].id,
          reference: data[0].reference,
          reservationId: data[0].reservation_id ?? undefined,
          email: data[0].email,
          amountKobo: data[0].amount_kobo,
          currency: data[0].currency,
          status: data[0].status,
          itemType: data[0].item_type,
          itemId: data[0].item_id,
          itemLabel: data[0].item_label,
          paymentMethod: data[0].payment_method ?? undefined,
          paymentChannel: data[0].payment_channel ?? undefined,
          externalReference: data[0].external_reference ?? undefined,
          source: data[0].source,
          createdAt: data[0].created_at,
        };
      }
    }
  }

  payments = [...(await readFilePayments()), ...demoPayments];
  return payments.find(
    (payment) =>
      payment.status === "pending" &&
      payment.paymentMethod === "moniepoint_transfer" &&
      payment.amountKobo === amountKobo,
  );
}
