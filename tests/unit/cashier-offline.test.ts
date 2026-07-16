import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import {
  OfflineOutboxError,
  clearOutboxStoreForTests,
  enqueueSettle,
  flushOutbox,
  listAll,
  listFailed,
  listPending,
  markFailed,
  markSynced,
  type FetchLike,
} from "@/lib/cashier-offline";

// No `indexedDB` global exists under `tsx --test` (plain Node, no jsdom), so
// every test here exercises the in-memory fallback path in `storage.ts` —
// which is exactly the environment these tests are meant to prove out.
assert.equal(typeof indexedDB, "undefined");

beforeEach(async () => {
  await clearOutboxStoreForTests();
});

describe("enqueueSettle", () => {
  it("queues a cash settle as pending", async () => {
    const item = await enqueueSettle({
      reservationId: "res-1",
      amountNgn: 25000,
      paymentMethod: "cash",
      clientMutationId: "cmid-1",
    });

    assert.equal(item.status, "pending");
    assert.equal(item.attempts, 0);
    assert.equal(item.id, "cmid-1");

    const pending = await listPending();
    assert.equal(pending.length, 1);
    assert.equal(pending[0].reservationId, "res-1");
  });

  it("generates a clientMutationId when omitted", async () => {
    const item = await enqueueSettle({
      reservationId: "res-2",
      amountNgn: 5000,
      paymentMethod: "cash",
    });
    assert.ok(item.clientMutationId.length > 0);
    assert.equal(item.id, item.clientMutationId);
  });

  it("is idempotent on clientMutationId (re-enqueue updates, not duplicates)", async () => {
    await enqueueSettle({
      reservationId: "res-3",
      amountNgn: 1000,
      paymentMethod: "cash",
      clientMutationId: "cmid-3",
    });
    await enqueueSettle({
      reservationId: "res-3",
      amountNgn: 1000,
      paymentMethod: "cash",
      clientMutationId: "cmid-3",
    });

    const all = await listAll();
    assert.equal(all.length, 1);
  });

  it("rejects non-cash methods unless allowNonCash is set", async () => {
    await assert.rejects(
      () =>
        enqueueSettle({
          reservationId: "res-4",
          amountNgn: 1000,
          paymentMethod: "paystack_terminal",
          clientMutationId: "cmid-4",
        }),
      OfflineOutboxError,
    );

    const item = await enqueueSettle(
      {
        reservationId: "res-4",
        amountNgn: 1000,
        paymentMethod: "paystack_terminal",
        clientMutationId: "cmid-4b",
      },
      { allowNonCash: true },
    );
    assert.equal(item.paymentMethod, "paystack_terminal");
  });

  it("rejects non-positive amounts", async () => {
    await assert.rejects(() =>
      enqueueSettle({
        reservationId: "res-5",
        amountNgn: 0,
        paymentMethod: "cash",
        clientMutationId: "cmid-5",
      }),
    );
  });
});

describe("markSynced / markFailed", () => {
  it("moves an item to synced", async () => {
    await enqueueSettle({
      reservationId: "res-6",
      amountNgn: 2000,
      paymentMethod: "cash",
      clientMutationId: "cmid-6",
    });
    const updated = await markSynced("cmid-6");
    assert.equal(updated?.status, "synced");
    assert.ok(updated?.syncedAt);
    assert.equal((await listPending()).length, 0);
  });

  it("moves an item to failed and increments attempts", async () => {
    await enqueueSettle({
      reservationId: "res-7",
      amountNgn: 2000,
      paymentMethod: "cash",
      clientMutationId: "cmid-7",
    });
    const updated = await markFailed("cmid-7", "boom");
    assert.equal(updated?.status, "failed");
    assert.equal(updated?.attempts, 1);
    assert.equal(updated?.lastError, "boom");

    const failed = await listFailed();
    assert.equal(failed.length, 1);
  });
});

describe("flushOutbox", () => {
  function fetchStub(handler: FetchLike): FetchLike {
    return handler;
  }

  it("marks a 200 response as synced", async () => {
    await enqueueSettle({
      reservationId: "res-8",
      amountNgn: 3000,
      paymentMethod: "cash",
      clientMutationId: "cmid-8",
    });

    const fetchImpl = fetchStub(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, paymentId: "pay-8", status: "success" }),
    }));

    const result = await flushOutbox(fetchImpl, { key: "demo-key" });
    assert.deepEqual(result, { synced: ["cmid-8"], failed: [], skipped: [] });
    assert.equal((await listPending()).length, 0);
  });

  it("treats 409 as an idempotent success", async () => {
    await enqueueSettle({
      reservationId: "res-9",
      amountNgn: 3000,
      paymentMethod: "cash",
      clientMutationId: "cmid-9",
    });

    const fetchImpl = fetchStub(async () => ({
      ok: false,
      status: 409,
      json: async () => ({ ok: true, status: "success" }),
    }));

    const result = await flushOutbox(fetchImpl);
    assert.deepEqual(result, { synced: ["cmid-9"], failed: [], skipped: [] });
  });

  it("leaves the item pending on a network error", async () => {
    await enqueueSettle({
      reservationId: "res-10",
      amountNgn: 3000,
      paymentMethod: "cash",
      clientMutationId: "cmid-10",
    });

    const fetchImpl = fetchStub(async () => {
      throw new TypeError("Failed to fetch");
    });

    const result = await flushOutbox(fetchImpl);
    assert.deepEqual(result, { synced: [], failed: [], skipped: ["cmid-10"] });

    const pending = await listPending();
    assert.equal(pending.length, 1);
    assert.equal(pending[0].attempts, 1);
    assert.equal(pending[0].lastError, "Failed to fetch");
  });

  it("marks non-409 error responses as failed", async () => {
    await enqueueSettle({
      reservationId: "res-11",
      amountNgn: 3000,
      paymentMethod: "cash",
      clientMutationId: "cmid-11",
    });

    const fetchImpl = fetchStub(async () => ({
      ok: false,
      status: 422,
      json: async () => ({ ok: false, error: "reservation already settled in full" }),
    }));

    const result = await flushOutbox(fetchImpl);
    assert.deepEqual(result, { synced: [], failed: ["cmid-11"], skipped: [] });

    const failed = await listFailed();
    assert.equal(failed[0].lastError, "reservation already settled in full");
  });

  it("processes each pending item exactly once and leaves synced items alone", async () => {
    await enqueueSettle({
      reservationId: "res-12",
      amountNgn: 1000,
      paymentMethod: "cash",
      clientMutationId: "cmid-12a",
    });
    await enqueueSettle({
      reservationId: "res-13",
      amountNgn: 1000,
      paymentMethod: "cash",
      clientMutationId: "cmid-12b",
    });

    let calls = 0;
    const fetchImpl = fetchStub(async () => {
      calls += 1;
      return { ok: true, status: 200, json: async () => ({ ok: true }) };
    });

    await flushOutbox(fetchImpl);
    assert.equal(calls, 2);

    // A second flush with nothing pending should not call fetch again.
    await flushOutbox(fetchImpl);
    assert.equal(calls, 2);
  });
});
