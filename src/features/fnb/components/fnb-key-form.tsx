"use client";

import { useState } from "react";

export function FnbKeyForm({
  initialKey,
  loading,
  onSubmit,
  placeholder,
  submitLabel,
}: {
  initialKey: string;
  loading: boolean;
  onSubmit: (key: string) => void;
  placeholder: string;
  submitLabel: string;
}) {
  const [inputKey, setInputKey] = useState(initialKey);

  return (
    <form
      className="mb-6 flex flex-wrap gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(inputKey);
      }}
    >
      <input
        type="password"
        value={inputKey}
        onChange={(e) => setInputKey(e.target.value)}
        placeholder={placeholder}
        className="h-10 min-w-[200px] flex-1 rounded-lg border border-border bg-card px-3 text-sm"
      />
      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-teal px-4 py-2 text-sm font-medium text-gray-950 disabled:opacity-60"
      >
        {submitLabel}
      </button>
    </form>
  );
}
