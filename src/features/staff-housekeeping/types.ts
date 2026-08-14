import type { RoomBlock, RoomBlockType } from "@/lib/db/inventory-store";

export type { RoomBlock, RoomBlockType };

export type RoomBlocksResponse = {
  ok?: boolean;
  blocks: RoomBlock[];
};

export type HousekeepingApiError = {
  ok: false;
  unauthorized?: boolean;
  forbidden?: boolean;
  error: string;
};

export type HousekeepingResult<T> = T | HousekeepingApiError;

export type CreateRoomBlockInput = {
  roomId: string;
  checkIn: string;
  checkOut: string;
  reason?: string;
  blockType: RoomBlockType;
};
