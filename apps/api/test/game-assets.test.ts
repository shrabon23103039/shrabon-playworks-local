import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { test } from "node:test";
import {
  GamePackageError,
  publishGamePackage,
  stageGamePackage,
  unpublishGamePackage,
} from "../src/game-assets.js";
import { LocalGameAssetStorage, type GameAssetStorage } from "../src/game-storage.js";

type ZipEntry = { name: string; content: string; mode?: number };

function crc32(content: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of content) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createZip(entries: ZipEntry[]): Buffer {
  const localRecords: Buffer[] = [];
  const directoryRecords: Buffer[] = [];
  let offset = 0;
  for (const item of entries) {
    const name = Buffer.from(item.name, "utf8");
    const content = Buffer.from(item.content, "utf8");
    const checksum = crc32(content);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt32LE(checksum, 14);
    local.writeUInt32LE(content.length, 18);
    local.writeUInt32LE(content.length, 22);
    local.writeUInt16LE(name.length, 26);
    localRecords.push(local, name, content);

    const directory = Buffer.alloc(46);
    directory.writeUInt32LE(0x02014b50, 0);
    directory.writeUInt16LE(0x0314, 4);
    directory.writeUInt16LE(20, 6);
    directory.writeUInt32LE(checksum, 16);
    directory.writeUInt32LE(content.length, 20);
    directory.writeUInt32LE(content.length, 24);
    directory.writeUInt16LE(name.length, 28);
    directory.writeUInt32LE(((item.mode ?? 0) * 0x10000) >>> 0, 38);
    directory.writeUInt32LE(offset, 42);
    directoryRecords.push(directory, name);
    offset += local.length + name.length + content.length;
  }

  const centralDirectory = Buffer.concat(directoryRecords);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralDirectory.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...localRecords, centralDirectory, end]);
}

function validEntries(): ZipEntry[] {
  return [
    { name: "playworks.json", content: JSON.stringify({ version: 1, entry: "index.html" }) },
    { name: "index.html", content: "<!doctype html><title>Game</title>" },
    { name: "game.js", content: "document.title = 'Game';" },
  ];
}

test("valid game packages stay staged until publish and never expose the manifest", async () => {
  const storageRoot = await mkdtemp(resolve(tmpdir(), "playworks-assets-"));
  const storage = new LocalGameAssetStorage(storageRoot);
  try {
    const staged = await stageGamePackage(createZip(validEntries()), storage);
    assert.match(staged.id, /^[0-9a-f-]{36}$/);
    assert.equal(staged.entryPath, `/packages/${staged.id}/index.html`);
    assert.equal(staged.manifest.files.length, 3);
    assert.equal(staged.contentHash.length, 64);
    await assert.rejects(readFile(resolve(storageRoot, "public", "packages", staged.id, "index.html")));

    await publishGamePackage(storage, staged.id);
    assert.equal(
      await readFile(resolve(storageRoot, "public", "packages", staged.id, "index.html"), "utf8"),
      "<!doctype html><title>Game</title>",
    );
    await assert.rejects(readFile(resolve(storageRoot, "public", "packages", staged.id, "playworks.json")));

    await unpublishGamePackage(storage, staged.id);
    assert.equal(
      await readFile(resolve(storageRoot, "staging", staged.id, "index.html"), "utf8"),
      "<!doctype html><title>Game</title>",
    );
  } finally {
    await rm(storageRoot, { recursive: true, force: true });
  }
});

test("game package validation rejects traversal, symlinks, and malformed manifests", async () => {
  const storageRoot = await mkdtemp(resolve(tmpdir(), "playworks-assets-"));
  const storage = new LocalGameAssetStorage(storageRoot);
  try {
    await assert.rejects(
      stageGamePackage(createZip([...validEntries(), { name: "../escape.js", content: "x" }]), storage),
      GamePackageError,
    );
    await assert.rejects(
      stageGamePackage(
        createZip(validEntries().map((entry) =>
          entry.name === "index.html" ? { ...entry, mode: 0o120777 } : entry,
        )),
        storage,
      ),
      GamePackageError,
    );
    await assert.rejects(
      stageGamePackage(
        createZip([{ name: "playworks.json", content: '{"version":2,"entry":"index.html"}' }, ...validEntries().slice(1)]),
        storage,
      ),
      GamePackageError,
    );
    await assert.rejects(readdir(resolve(storageRoot, "staging")));
  } finally {
    await rm(storageRoot, { recursive: true, force: true });
  }
});

test("storage failures remain operational errors and do not become validation errors", async () => {
  const error = new Error("storage unavailable");
  const storage: GameAssetStorage = {
    stagePackage: async () => { throw error; },
    publishPackage: async () => false,
    unpublishPackage: async () => {},
    discardStagedPackage: async () => {},
    getStagedObject: async () => null,
    getPublishedObject: async () => null,
  };
  await assert.rejects(
    stageGamePackage(createZip(validEntries()), storage),
    (actual: unknown) => actual === error,
  );
});
