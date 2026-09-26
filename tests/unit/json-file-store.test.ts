import assert from "node:assert/strict";
import { mkdtemp, readdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import { readJsonFile, updateJsonFile } from "@/lib/json-file-store";

type Store = { items: number[] };
const empty = (): Store => ({ items: [] });

async function tempFile() {
  const dir = await mkdtemp(path.join(tmpdir(), "json-file-store-"));
  return { dir, file: path.join(dir, "store.json") };
}

describe("json-file-store", () => {
  it("starts empty when the file does not exist", async () => {
    const { file } = await tempFile();
    assert.deepEqual(await readJsonFile(file, empty), { items: [] });
  });

  it("keeps every write when many updates run concurrently", async () => {
    const { dir, file } = await tempFile();
    await Promise.all(
      Array.from({ length: 25 }, (_, i) =>
        updateJsonFile(file, empty, (store) => {
          store.items.push(i);
        }),
      ),
    );

    const saved = JSON.parse(await readFile(file, "utf-8")) as Store;
    assert.equal(saved.items.length, 25);
    // Temp files are always renamed into place, never left behind.
    assert.deepEqual(await readdir(dir), ["store.json"]);
  });

  it("refuses to overwrite a corrupt file instead of wiping it", async () => {
    const { file } = await tempFile();
    await writeFile(file, '{"items": [1, 2', "utf-8");

    await assert.rejects(
      updateJsonFile(file, empty, (store) => {
        store.items.push(3);
      }),
      /not valid JSON/,
    );
    assert.equal(await readFile(file, "utf-8"), '{"items": [1, 2');
  });

  it("returns the callback's result", async () => {
    const { file } = await tempFile();
    const result = await updateJsonFile(file, empty, (store) => {
      store.items.push(7);
      return store.items.length;
    });
    assert.equal(result, 1);
  });
});
