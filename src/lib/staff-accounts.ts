/**
 * Staff accounts (Agent O — real staff identity/RBAC).
 *
 * File-backed by default (`data/staff-accounts.json`, mirrors the pattern in
 * `src/lib/folio/store.ts`), with an optional Supabase-backed path (see
 * `docs/supabase/migration-010-staff-accounts.sql`) that activates
 * automatically once `isSupabaseEnabled()` is true.
 */

import { getSupabaseAdmin, isSupabaseEnabled } from "@/lib/db/client";
import { isStaffRole, type StaffRole } from "@/lib/staff-roles";
import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from "crypto";
import { promises as fs } from "fs";
import path from "path";

export type StaffAccount = {
  id: string;
  name: string;
  role: StaffRole;
  pinHash: string;
  active: boolean;
  createdAt: string;
};

export type PublicStaffAccount = Omit<StaffAccount, "pinHash">;

export function toPublicStaffAccount(account: StaffAccount): PublicStaffAccount {
  return {
    id: account.id,
    name: account.name,
    role: account.role,
    active: account.active,
    createdAt: account.createdAt,
  };
}

export function hashPin(pin: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(pin, salt, 32);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

export function verifyPin(pin: string, stored: string): boolean {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;
  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(hashHex, "hex");
  const actual = scryptSync(pin, salt, 32);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

const STORE_DIR = path.join(process.cwd(), "data");
const STORE_FILE = path.join(STORE_DIR, "staff-accounts.json");

type StaffAccountsFile = { accounts: StaffAccount[] };

/** One demo PIN per role — file-store + DEMO_MODE only, never in production. */
const DEMO_SEED: { name: string; role: StaffRole; pin: string }[] = [
  { name: "Cashier Demo", role: "cashier", pin: "1111" },
  { name: "Manager Demo", role: "manager", pin: "2222" },
  { name: "Restaurant Owner Demo", role: "restaurant_owner", pin: "3333" },
  { name: "Cleaner Head Demo", role: "cleaner_head", pin: "4444" },
];

async function readFile(): Promise<StaffAccountsFile> {
  try {
    const raw = await fs.readFile(STORE_FILE, "utf-8");
    return JSON.parse(raw) as StaffAccountsFile;
  } catch {
    const initial: StaffAccountsFile = { accounts: [] };
    if (process.env.DEMO_MODE === "true") {
      initial.accounts = DEMO_SEED.map((seed) => ({
        id: randomUUID(),
        name: seed.name,
        role: seed.role,
        pinHash: hashPin(seed.pin),
        active: true,
        createdAt: new Date().toISOString(),
      }));
    }
    await writeFile(initial);
    return initial;
  }
}

async function writeFile(data: StaffAccountsFile): Promise<void> {
  await fs.mkdir(STORE_DIR, { recursive: true });
  await fs.writeFile(STORE_FILE, JSON.stringify(data, null, 2), "utf-8");
}

function mapRow(row: Record<string, unknown>): StaffAccount {
  return {
    id: row.id as string,
    name: row.name as string,
    role: row.role as StaffRole,
    pinHash: row.pin_hash as string,
    active: row.active as boolean,
    createdAt: row.created_at as string,
  };
}

export async function listStaffAccounts(): Promise<StaffAccount[]> {
  if (!isSupabaseEnabled()) {
    const file = await readFile();
    return file.accounts;
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("staff_accounts")
    .select("id, name, role, pin_hash, active, created_at")
    .order("created_at", { ascending: true });

  if (error || !data) return [];
  return data.map(mapRow);
}

export async function findStaffAccountByName(
  name: string,
): Promise<StaffAccount | undefined> {
  const needle = name.trim().toLowerCase();
  if (!needle) return undefined;

  if (!isSupabaseEnabled()) {
    const file = await readFile();
    return file.accounts.find((a) => a.name.trim().toLowerCase() === needle);
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) return undefined;

  const { data, error } = await supabase
    .from("staff_accounts")
    .select("id, name, role, pin_hash, active, created_at")
    .ilike("name", name.trim())
    .maybeSingle();

  if (error || !data) return undefined;
  return mapRow(data);
}

export async function addStaffAccount(input: {
  name: string;
  role: StaffRole;
  pin: string;
}): Promise<StaffAccount> {
  if (!isStaffRole(input.role)) {
    throw new Error(`Unknown staff role: ${input.role}`);
  }

  const pinHash = hashPin(input.pin);

  if (!isSupabaseEnabled()) {
    const file = await readFile();
    const account: StaffAccount = {
      id: randomUUID(),
      name: input.name.trim(),
      role: input.role,
      pinHash,
      active: true,
      createdAt: new Date().toISOString(),
    };
    file.accounts.push(account);
    await writeFile(file);
    return account;
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error("Supabase not configured");

  const { data, error } = await supabase
    .from("staff_accounts")
    .insert({
      name: input.name.trim(),
      role: input.role,
      pin_hash: pinHash,
      active: true,
    })
    .select("id, name, role, pin_hash, active, created_at")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Insert staff account failed");
  }
  return mapRow(data);
}

/** Returns the matching active account, or null on any mismatch/inactive account. */
export async function verifyStaffCredentials(
  name: string,
  pin: string,
): Promise<StaffAccount | null> {
  const account = await findStaffAccountByName(name);
  if (!account || !account.active) return null;
  return verifyPin(pin, account.pinHash) ? account : null;
}
