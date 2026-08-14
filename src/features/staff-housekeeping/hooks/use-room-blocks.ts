"use client";

import {
  createRoomBlock,
  deleteRoomBlock,
  fetchRoomBlocks,
  isHousekeepingError,
} from "@/features/staff-housekeeping/lib/api";
import type { CreateRoomBlockInput, RoomBlock } from "@/features/staff-housekeeping/types";
import { useCallback, useEffect, useState } from "react";

export function useRoomBlocks(key: string | null) {
  const [blocks, setBlocks] = useState<RoomBlock[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [loadedOnce, setLoadedOnce] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async (loadKey: string | undefined) => {
    setLoading(true);
    setError(null);
    const result = await fetchRoomBlocks(loadKey);
    if (isHousekeepingError(result)) {
      setError(result.error);
      setForbidden(Boolean(result.forbidden));
      setBlocks([]);
    } else {
      setBlocks(result.blocks ?? []);
      setForbidden(false);
    }
    setLoading(false);
    setLoadedOnce(true);
  }, []);

  useEffect(() => {
    if (key === null) return;
    load(key ?? undefined);
  }, [key, load]);

  const addBlock = useCallback(
    async (input: CreateRoomBlockInput) => {
      setActionError(null);
      const result = await createRoomBlock(key ?? undefined, input);
      if (isHousekeepingError(result)) {
        setActionError(result.error);
        return false;
      }
      await load(key ?? undefined);
      return true;
    },
    [key, load],
  );

  const markClean = useCallback(
    async (id: string) => {
      setActionError(null);
      const result = await deleteRoomBlock(key ?? undefined, id);
      if (isHousekeepingError(result)) {
        setActionError(result.error);
        return false;
      }
      await load(key ?? undefined);
      return true;
    },
    [key, load],
  );

  return {
    blocks,
    loading,
    error,
    forbidden,
    loadedOnce,
    actionError,
    addBlock,
    markClean,
    refresh: () => key !== null && load(key ?? undefined),
  };
}
