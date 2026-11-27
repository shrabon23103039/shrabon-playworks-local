import { createHash, randomUUID } from "node:crypto";
import { createWriteStream } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { extname, isAbsolute, join, resolve, sep } from "node:path";
import { tmpdir } from "node:os";
import { Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { z } from "zod";
import yauzl from "yauzl";
import type { GameAssetStorage, GameStorageFile } from "./game-storage.js";

export const MAX_GAME_ARCHIVE_BYTES = 15 * 1024 * 1024;
const MAX_EXPANDED_BYTES = 50 * 1024 * 1024;
const MAX_FILES = 500;
const MAX_FILE_BYTES = 25 * 1024 * 1024;
const MAX_COMPRESSION_RATIO = 200;
const MIN_RATIO_BASE_BYTES = 1024 * 1024;
const SAFE_EXTENSIONS = new Set([
  ".avif", ".css", ".gif", ".html", ".jpeg", ".jpg", ".js", ".json",
  ".m4a", ".mp3", ".mp4", ".ogg", ".png", ".ttf", ".wav", ".webm",
  ".webp", ".woff", ".woff2",
]);
const PackageManifest = z.object({
  version: z.literal(1),
  entry: z.literal("index.html"),
}).strict();

export class GamePackageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GamePackageError";
  }
}

export type StagedGamePackage = {
  id: string;
  entryPath: string;
  contentHash: string;
  compressedSize: number;
  expandedSize: number;
  manifest: {
    version: 1;
    entry: "index.html";
    files: Array<{ path: string; size: number; sha256: string }>;
  };
};

function checkedArchivePath(fileName: string): { path: string; directory: boolean } {
  const directory = fileName.endsWith("/");
  const candidate = directory ? fileName.slice(0, -1) : fileName;
  const segments = candidate.split("/");
  if (
    !candidate ||
    candidate.length > 240 ||
    candidate.includes("\\") ||
    candidate.includes(":") ||
    candidate.includes("\0") ||
    /[\u0000-\u001f\u007f]/.test(candidate) ||
    candidate.startsWith("/") ||
    /^[a-zA-Z]:/.test(candidate) ||
    isAbsolute(candidate) ||
    candidate !== candidate.normalize("NFC") ||
    segments.some((segment) =>
      !segment ||
      segment === "." ||
      segment === ".." ||
      segment.startsWith(".") ||
      segment.endsWith(".") ||
      segment.endsWith(" ") ||
      segment.length > 100 ||
      /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(segment),
    )
  ) {
    throw new GamePackageError("The archive contains an unsafe path.");
  }
  const normalized = segments.join("/");
  if (normalized !== candidate || (!directory && !SAFE_EXTENSIONS.has(extname(candidate).toLowerCase()))) {
    throw new GamePackageError("The archive contains an unsupported file path or type.");
  }
  return { path: normalized, directory };
}

function ensureWithin(root: string, candidate: string): void {
  const relative = candidate.slice(root.length);
  if (candidate !== root && !relative.startsWith(sep)) {
    throw new GamePackageError("The archive contains an unsafe path.");
  }
}

export async function stageGamePackage(
  archive: Buffer,
  storage: GameAssetStorage,
): Promise<StagedGamePackage> {
  if (!archive.length || archive.length > MAX_GAME_ARCHIVE_BYTES) {
    throw new GamePackageError("The ZIP package must be between 1 byte and 15 MiB.");
  }

  const temporaryDirectory = await mkdtemp(join(tmpdir(), "playworks-incoming-"));
  const id = randomUUID();
  const extractedFiles: Array<GameStorageFile & { sha256: string }> = [];
  const seenPaths = new Set<string>();
  let expandedSize = 0;
  let entriesSeen = 0;
  let staged: StagedGamePackage;

  try {
    const zip = await yauzl.fromBufferPromise(archive, {
      lazyEntries: true,
      decodeStrings: true,
      strictFileNames: true,
      validateEntrySizes: true,
    });
    try {
      for await (const entry of zip.eachEntry()) {
        entriesSeen += 1;
        if (entriesSeen > MAX_FILES * 2) {
          throw new GamePackageError("The ZIP package contains too many entries.");
        }
        const { path, directory } = checkedArchivePath(entry.fileName);
        const foldedPath = path.toLowerCase();
        if (seenPaths.has(foldedPath)) {
          throw new GamePackageError("The ZIP package contains duplicate paths.");
        }
        seenPaths.add(foldedPath);
        const fileType = (entry.externalFileAttributes >>> 16) & 0xf000;
        if (
          entry.isEncrypted() ||
          (fileType !== 0 && fileType !== 0x8000 && fileType !== 0x4000) ||
          (fileType === 0x4000 && !directory) ||
          (fileType === 0x8000 && directory)
        ) {
          throw new GamePackageError("The ZIP package contains an unsupported entry.");
        }

        const outputPath = resolve(temporaryDirectory, ...path.split("/"));
        ensureWithin(temporaryDirectory, outputPath);
        if (directory) {
          await mkdir(outputPath, { recursive: true });
          continue;
        }
        if (extractedFiles.length >= MAX_FILES) {
          throw new GamePackageError("The ZIP package contains too many files.");
        }

        if (
          !Number.isSafeInteger(entry.uncompressedSize) ||
          entry.uncompressedSize < 0 ||
          entry.uncompressedSize > MAX_FILE_BYTES ||
          !Number.isSafeInteger(entry.compressedSize) ||
          entry.compressedSize < 0
        ) {
          throw new GamePackageError("The ZIP package contains an invalid or oversized file.");
        }
        expandedSize += entry.uncompressedSize;
        if (expandedSize > MAX_EXPANDED_BYTES) {
          throw new GamePackageError("The expanded ZIP package exceeds 50 MiB.");
        }
        if (
          entry.uncompressedSize >
          Math.max(MIN_RATIO_BASE_BYTES, entry.compressedSize * MAX_COMPRESSION_RATIO)
        ) {
          throw new GamePackageError("The ZIP package exceeds the allowed compression ratio.");
        }

        await mkdir(resolve(outputPath, ".."), { recursive: true });
        const fileHash = createHash("sha256");
        let actualSize = 0;
        const sizeGuard = new Transform({
          transform(chunk: Buffer, _encoding, callback) {
            actualSize += chunk.length;
            if (actualSize > entry.uncompressedSize || actualSize > MAX_FILE_BYTES) {
              callback(new GamePackageError("The ZIP package file exceeds its declared size."));
              return;
            }
            fileHash.update(chunk);
            callback(null, chunk);
          },
        });
        const source = await zip.openReadStreamPromise(entry);
        await pipeline(source, sizeGuard, createWriteStream(outputPath, { flags: "wx" }));
        if (actualSize !== entry.uncompressedSize) {
          throw new GamePackageError("The ZIP package file size does not match its directory.");
        }
        extractedFiles.push({ path, size: actualSize, sha256: fileHash.digest("hex") });
      }
    } finally {
      zip.close();
    }

    if (!extractedFiles.some((file) => file.path === "index.html")) {
      throw new GamePackageError("The ZIP package must contain a root index.html entry.");
    }
    const manifestBytes = await readFile(resolve(temporaryDirectory, "playworks.json"));
    if (manifestBytes.length > 4096) {
      throw new GamePackageError("The game manifest is too large.");
    }
    let manifestInput: unknown;
    try {
      manifestInput = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(manifestBytes));
    } catch {
      throw new GamePackageError("The game manifest is malformed.");
    }
    const parsedManifest = PackageManifest.safeParse(manifestInput);
    if (!parsedManifest.success) {
      throw new GamePackageError("The game manifest must declare version 1 and index.html.");
    }
    const entry = await stat(resolve(temporaryDirectory, parsedManifest.data.entry));
    if (!entry.isFile()) {
      throw new GamePackageError("The game manifest entry must be a regular file.");
    }

    staged = {
      id,
      entryPath: `/packages/${id}/index.html`,
      contentHash: createHash("sha256").update(archive).digest("hex"),
      compressedSize: archive.length,
      expandedSize,
      manifest: {
        ...parsedManifest.data,
        files: extractedFiles.sort((left, right) => left.path.localeCompare(right.path)),
      },
    };
  } catch (error) {
    await rm(temporaryDirectory, { recursive: true, force: true });
    if (error instanceof GamePackageError) throw error;
    throw new GamePackageError("The ZIP package could not be validated.");
  }

  try {
    await storage.stagePackage(id, temporaryDirectory, extractedFiles);
    return staged;
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
}

export async function publishGamePackage(storage: GameAssetStorage, id: string): Promise<boolean> {
  return storage.publishPackage(id);
}

export async function unpublishGamePackage(storage: GameAssetStorage, id: string): Promise<void> {
  await storage.unpublishPackage(id);
}

export async function discardStagedGamePackage(storage: GameAssetStorage, id: string): Promise<void> {
  await storage.discardStagedPackage(id);
}
