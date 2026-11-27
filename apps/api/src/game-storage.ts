import {
  CopyObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { extname, join, relative, resolve, sep } from "node:path";

const PACKAGE_ID = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const MIME_TYPES: Readonly<Record<string, string>> = {
  ".avif": "image/avif",
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".m4a": "audio/mp4",
  ".mp3": "audio/mpeg",
  ".mp4": "video/mp4",
  ".ogg": "audio/ogg",
  ".png": "image/png",
  ".ttf": "font/ttf",
  ".wav": "audio/wav",
  ".webm": "video/webm",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

export type GameStorageFile = { path: string; size: number };
export type StoredGameObject = { body: Buffer; contentType: string };

export interface GameAssetStorage {
  stagePackage(id: string, sourceDirectory: string, files: GameStorageFile[]): Promise<void>;
  publishPackage(id: string): Promise<boolean>;
  unpublishPackage(id: string): Promise<void>;
  discardStagedPackage(id: string): Promise<void>;
  getStagedObject(id: string, path: string): Promise<StoredGameObject | null>;
  getPublishedObject(id: string, path: string): Promise<StoredGameObject | null>;
}

function assertPackageId(id: string): void {
  if (!PACKAGE_ID.test(id)) throw new Error("Invalid game package id");
}

function safeRelativePath(value: string): string {
  const segments = value.split("/");
  if (
    !value ||
    value.includes("\\") ||
    value.includes("\0") ||
    value !== value.normalize("NFC") ||
    segments.some((segment) =>
      !segment ||
      segment === "." ||
      segment === ".." ||
      segment.startsWith(".") ||
      segment.endsWith(".") ||
      segment.endsWith(" ") ||
      segment.includes(":"),
    )
  ) {
    throw new Error("Invalid game package object path");
  }
  return segments.join("/");
}

export function gameAssetContentType(path: string): string {
  const contentType = MIME_TYPES[extname(path).toLowerCase()];
  if (!contentType) throw new Error("Unsupported game package content type");
  return contentType;
}

async function listLocalFiles(root: string): Promise<string[]> {
  const files: string[] = [];
  async function visit(directory: string): Promise<void> {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) await visit(path);
      else if (entry.isFile()) files.push(relative(root, path).split(sep).join("/"));
      else throw new Error("Unsupported file in staged game package");
    }
  }
  await visit(root);
  return files;
}

function isMissingFile(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}

function isMissingObject(error: unknown): boolean {
  return typeof error === "object" &&
    error !== null &&
    "$metadata" in error &&
    typeof error.$metadata === "object" &&
    error.$metadata !== null &&
    "httpStatusCode" in error.$metadata &&
    error.$metadata.httpStatusCode === 404;
}

export class LocalGameAssetStorage implements GameAssetStorage {
  private readonly root: string;

  constructor(root: string) {
    this.root = resolve(root);
  }

  private stagedPath(id: string): string {
    assertPackageId(id);
    return resolve(this.root, "staging", id);
  }

  private publishedPath(id: string): string {
    assertPackageId(id);
    return resolve(this.root, "public", "packages", id);
  }

  private objectPath(root: string, path: string): string {
    const safePath = safeRelativePath(path);
    const candidate = resolve(root, ...safePath.split("/"));
    if (!candidate.startsWith(`${root}${sep}`)) throw new Error("Invalid game package object path");
    return candidate;
  }

  async stagePackage(id: string, sourceDirectory: string, files: GameStorageFile[]): Promise<void> {
    const target = this.stagedPath(id);
    await mkdir(resolve(target, ".."), { recursive: true });
    await mkdir(target, { recursive: false });
    try {
      for (const file of files) {
        const path = this.objectPath(target, file.path);
        await mkdir(resolve(path, ".."), { recursive: true });
        const body = await readFile(this.objectPath(sourceDirectory, file.path));
        if (body.length !== file.size) throw new Error("Staged game file size changed during storage");
        await writeFile(path, body, { flag: "wx" });
      }
    } catch (error) {
      await rm(target, { recursive: true, force: true });
      throw error;
    }
  }

  async publishPackage(id: string): Promise<boolean> {
    const staged = this.stagedPath(id);
    const published = this.publishedPath(id);
    const files = (await listLocalFiles(staged)).filter((path) => path !== "playworks.json");
    if (files.length === 0) throw new Error("Staged game package is empty");
    try {
      await stat(published);
      return false;
    } catch (error) {
      if (!isMissingFile(error)) throw error;
    }

    await mkdir(resolve(published, ".."), { recursive: true });
    try {
      await mkdir(published, { recursive: false });
      for (const file of files) {
        const source = this.objectPath(staged, file);
        const destination = this.objectPath(published, file);
        await mkdir(resolve(destination, ".."), { recursive: true });
        await cp(source, destination, { errorOnExist: true, force: false });
      }
      return true;
    } catch (error) {
      await rm(published, { recursive: true, force: true });
      throw error;
    }
  }

  async unpublishPackage(id: string): Promise<void> {
    await rm(this.publishedPath(id), { recursive: true, force: true });
  }

  async discardStagedPackage(id: string): Promise<void> {
    await rm(this.stagedPath(id), { recursive: true, force: true });
  }

  async getStagedObject(id: string, path: string): Promise<StoredGameObject | null> {
    return this.readObject(this.stagedPath(id), path);
  }

  async getPublishedObject(id: string, path: string): Promise<StoredGameObject | null> {
    return this.readObject(this.publishedPath(id), path);
  }

  private async readObject(root: string, path: string): Promise<StoredGameObject | null> {
    const safePath = safeRelativePath(path);
    try {
      const body = await readFile(this.objectPath(root, safePath));
      return { body, contentType: gameAssetContentType(safePath) };
    } catch (error) {
      if (isMissingFile(error)) return null;
      throw error;
    }
  }
}

export type S3GameAssetStorageConfig = {
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
};

export class S3GameAssetStorage implements GameAssetStorage {
  constructor(
    private readonly client: S3Client,
    private readonly bucket: string,
  ) {}

  async stagePackage(id: string, sourceDirectory: string, files: GameStorageFile[]): Promise<void> {
    assertPackageId(id);
    try {
      for (const file of files) {
        const path = safeRelativePath(file.path);
        const body = await readFile(resolve(sourceDirectory, ...path.split("/")));
        if (body.length !== file.size) throw new Error("Staged game file size changed during storage");
        await this.client.send(new PutObjectCommand({
          Bucket: this.bucket,
          Key: `staging/${id}/${path}`,
          Body: body,
          ContentLength: body.length,
          ContentType: gameAssetContentType(path),
          CacheControl: "private, no-store",
        }));
      }
    } catch (error) {
      await this.deletePrefix(`staging/${id}/`);
      throw error;
    }
  }

  async publishPackage(id: string): Promise<boolean> {
    assertPackageId(id);
    const stagedKeys = (await this.listKeys(`staging/${id}/`))
      .filter((key) => !key.endsWith("/playworks.json"));
    if (stagedKeys.length === 0) throw new Error("Staged game package is empty");
    const packagePrefix = `packages/${id}/`;
    const packageKeys = stagedKeys.map((key) => `${packagePrefix}${key.slice(`staging/${id}/`.length)}`);
    const existingKeys = await this.listKeys(packagePrefix);
    if (
      existingKeys.length === packageKeys.length &&
      packageKeys.every((key) => existingKeys.includes(key))
    ) return false;
    if (existingKeys.length > 0) await this.deleteKeys(existingKeys);

    try {
      for (const sourceKey of stagedKeys) {
        const relativePath = sourceKey.slice(`staging/${id}/`.length);
        const destinationKey = `${packagePrefix}${relativePath}`;
        await this.client.send(new CopyObjectCommand({
          Bucket: this.bucket,
          Key: destinationKey,
          CopySource: `/${encodeURIComponent(this.bucket)}/${sourceKey.split("/").map(encodeURIComponent).join("/")}`,
          MetadataDirective: "COPY",
        }));
      }
      return true;
    } catch (error) {
      await this.deletePrefix(`packages/${id}/`);
      throw error;
    }
  }

  async unpublishPackage(id: string): Promise<void> {
    assertPackageId(id);
    await this.deletePrefix(`packages/${id}/`);
  }

  async discardStagedPackage(id: string): Promise<void> {
    assertPackageId(id);
    await this.deletePrefix(`staging/${id}/`);
  }

  async getStagedObject(id: string, path: string): Promise<StoredGameObject | null> {
    return this.getObject(`staging/${id}/${safeRelativePath(path)}`, path);
  }

  async getPublishedObject(id: string, path: string): Promise<StoredGameObject | null> {
    return this.getObject(`packages/${id}/${safeRelativePath(path)}`, path);
  }

  private async getObject(key: string, path: string): Promise<StoredGameObject | null> {
    assertPackageId(key.split("/")[1] ?? "");
    try {
      const result = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
      if (!result.Body) throw new Error("Object storage returned an empty game asset");
      return {
        body: Buffer.from(await result.Body.transformToByteArray()),
        contentType: result.ContentType ?? gameAssetContentType(path),
      };
    } catch (error) {
      if (isMissingObject(error)) return null;
      throw error;
    }
  }

  private async listKeys(prefix: string): Promise<string[]> {
    const keys: string[] = [];
    let continuationToken: string | undefined;
    do {
      const page = await this.client.send(new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      }));
      keys.push(...(page.Contents ?? []).flatMap((object) => object.Key ? [object.Key] : []));
      continuationToken = page.IsTruncated ? page.NextContinuationToken : undefined;
      if (page.IsTruncated && !continuationToken) {
        throw new Error("Object storage returned an invalid continuation token");
      }
    } while (continuationToken);
    return keys;
  }

  private async deletePrefix(prefix: string): Promise<void> {
    await this.deleteKeys(await this.listKeys(prefix));
  }

  private async deleteKeys(keys: string[]): Promise<void> {
    for (let offset = 0; offset < keys.length; offset += 1000) {
      const result = await this.client.send(new DeleteObjectsCommand({
        Bucket: this.bucket,
        Delete: {
          Quiet: true,
          Objects: keys.slice(offset, offset + 1000).map((Key) => ({ Key })),
        },
      }));
      if ((result.Errors ?? []).length > 0) throw new Error("Object storage could not remove every game asset");
    }
  }
}

export function createS3GameAssetStorage(config: S3GameAssetStorageConfig): S3GameAssetStorage {
  return new S3GameAssetStorage(
    new S3Client({
      endpoint: config.endpoint,
      region: config.region,
      forcePathStyle: true,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    }),
    config.bucket,
  );
}
