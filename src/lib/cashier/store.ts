/**
 * Cashier-scoped idempotency + provider-metadata cache (ADR-005).
 *
 * `clientMutationId` and Paystack Terminal `offline_reference`/`invoiceId`
 * have no home on the existing `PaymentRecord` shape (owned by
 * `src/lib/demo-store.ts`, out of scope for this agent), so they live here
 * as an in-memory, process-scoped cache — analogous to the token cache in
 * `src/lib/moniepoint.ts`. Good enough for the demo/file-store deployment
 * target; a production Supabase deployment can persist the same fields on
 * the `payments` row (columns already added by migration-008).
 */

export type CashierProviderMeta = {
  offlineReference?: string;
  providerTerminalId?: string;
  invoiceId?: string;
  eventId?: string;
};

const mutationIndex = new Map<string, string>();
const providerMetaIndex = new Map<string, CashierProviderMeta>();

export async function findReferenceForMutation(
  clientMutationId: string,
): Promise<string | undefined> {
  return mutationIndex.get(clientMutationId);
}

export async function recordMutation(
  clientMutationId: string,
  reference: string,
): Promise<void> {
  mutationIndex.set(clientMutationId, reference);
}

export async function saveProviderMeta(
  reference: string,
  meta: CashierProviderMeta,
): Promise<void> {
  providerMetaIndex.set(reference, {
    ...providerMetaIndex.get(reference),
    ...meta,
  });
}

export async function getProviderMeta(
  reference: string,
): Promise<CashierProviderMeta | undefined> {
  return providerMetaIndex.get(reference);
}
