"use client";

import { formatNaira } from "@/lib/utils";
import Link from "next/link";
import { useState } from "react";

type ApproveState = "idle" | "approving" | "needs-key" | "success" | "error";

export function BankTransferApproveClient({
  token,
  reference,
  guestName,
  amountKobo,
  itemLabel,
  status,
}: {
  token: string;
  reference: string;
  guestName?: string;
  amountKobo: number;
  itemLabel: string;
  status: string;
}) {
  const [state, setState] = useState<ApproveState>(
    status === "pending" ? "idle" : "success",
  );
  const [alreadyHandled] = useState(status !== "pending");
  const [key, setKey] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function approve(withKey?: string) {
    setState("approving");
    setError(null);
    try {
      const url = withKey
        ? `/api/bank-transfer/approve/${encodeURIComponent(token)}?key=${encodeURIComponent(withKey)}`
        : `/api/bank-transfer/approve/${encodeURIComponent(token)}`;
      const res = await fetch(url, { method: "POST" });

      if (res.status === 401 || res.status === 403) {
        setState("needs-key");
        return;
      }

      const body = (await res.json().catch(() => null)) as
        | { ok: boolean; error?: string }
        | null;

      if (!res.ok || !body?.ok) {
        setError(
          body?.error === "not_pending"
            ? "This transfer has already been handled."
            : "Could not approve this payment. Try the staff dashboard instead.",
        );
        setState("error");
        return;
      }

      setState("success");
    } catch {
      setError("Could not reach the server. Try the staff dashboard instead.");
      setState("error");
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">
        Bank transfer approval
      </p>
      <h1 className="mt-1 text-lg font-semibold">
        {guestName ?? "Guest"} — {formatNaira(Math.round(amountKobo / 100))}
      </h1>
      <p className="mt-1 text-sm text-muted">{itemLabel}</p>
      <p className="mt-1 font-mono text-xs text-muted">{reference}</p>

      <p className="mt-4 text-sm text-muted">
        This has <strong>not</strong> been verified by any payment gateway.
        Check your bank app for the incoming transfer before approving —
        approving reserves the room.
      </p>

      {alreadyHandled ? (
        <p className="mt-6 rounded-lg border border-teal/40 bg-teal/10 px-3 py-2 text-sm text-teal-dark">
          This transfer has already been handled (status: {status}).
        </p>
      ) : state === "success" ? (
        <p className="mt-6 rounded-lg border border-teal/40 bg-teal/10 px-3 py-2 text-sm text-teal-dark">
          Approved — the reservation is confirmed.
        </p>
      ) : (
        <div className="mt-6 space-y-3">
          <button
            type="button"
            onClick={() => approve()}
            disabled={state === "approving"}
            className="w-full rounded-full bg-teal px-4 py-2 text-sm font-medium text-gray-950 disabled:opacity-60"
          >
            {state === "approving" ? "Approving…" : "Approve this payment"}
          </button>

          {state === "needs-key" ? (
            <div className="space-y-2 border-t border-border pt-3">
              <label className="block text-xs font-medium text-muted" htmlFor="staff-key">
                Staff dashboard key
              </label>
              <input
                id="staff-key"
                type="password"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
              />
              <button
                type="button"
                onClick={() => approve(key)}
                disabled={!key || state !== "needs-key"}
                className="w-full rounded-full border border-teal px-4 py-2 text-sm font-medium text-teal-dark disabled:opacity-60"
              >
                Approve with key
              </button>
              <p className="text-xs text-muted">
                No key? You may need to{" "}
                <Link href="/staff/login" className="text-teal hover:underline">
                  log into the staff portal
                </Link>{" "}
                first, then come back to this link.
              </p>
            </div>
          ) : null}

          {error ? (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
