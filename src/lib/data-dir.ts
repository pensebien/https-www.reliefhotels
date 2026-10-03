import path from "path";

/**
 * Where the local JSON file stores live (file mode only; production uses
 * Supabase). RELIEF_DATA_DIR overrides it — the test runner points it at a
 * fresh temp folder so runs never touch, or pile up in, your local data/.
 */
export function dataPath(...parts: string[]): string {
  const root = process.env.RELIEF_DATA_DIR?.trim() || path.join(process.cwd(), "data");
  return path.join(root, ...parts);
}
