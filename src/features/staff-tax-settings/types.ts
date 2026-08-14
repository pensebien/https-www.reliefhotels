import type { TaxCollectionMode, TaxSettings } from "@/lib/tax-settings";

export type { TaxCollectionMode, TaxSettings };

export type TaxSettingsResponse = {
  ok?: boolean;
  settings: TaxSettings;
};

export type TaxSettingsApiError = {
  ok: false;
  unauthorized?: boolean;
  forbidden?: boolean;
  error: string;
};

export type TaxSettingsResult<T> = T | TaxSettingsApiError;
