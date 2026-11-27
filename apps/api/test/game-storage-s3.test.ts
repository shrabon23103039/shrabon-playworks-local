import assert from "node:assert/strict";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { test } from "node:test";
import { S3Client } from "@aws-sdk/client-s3";
import { S3GameAssetStorage, type GameStorageFile } from "../src/game-storage.js";

type StoredObject = { body: Buffer; contentType: string; cacheControl: string };

function xmlEscape(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&apos;",
  })[character]!);
}

async function requestBody(request: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}

function respond(response: ServerResponse, status: number, body = ""): void {
  response.statusCode = status;
  response.end(body);
}

async function makeS3Fixture() {
  const objects = new Map<string, StoredObject>();
  const failures = { put: false, copy: false };
  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? "/", "http://localhost");
      const [bucket, ...pathParts] = url.pathname.split("/").filter(Boolean);
      if (bucket !== "test-bucket") {
        respond(response, 404, "<Error><Code>NoSuchBucket</Code></Error>");
        return;
      }
      const key = pathParts.map(decodeURIComponent).join("/");
      if (request.method === "GET" && url.searchParams.has("list-type")) {
        const prefix = url.searchParams.get("prefix") ?? "";
        const contents = [...objects.keys()]
          .filter((objectKey) => objectKey.startsWith(prefix))
          .map((objectKey) => `<Contents><Key>${xmlEscape(objectKey)}</Key></Contents>`)
          .join("");
        respond(response, 200, `<ListBucketResult><IsTruncated>false</IsTruncated>${contents}</ListBucketResult>`);
        return;
      }
      if (request.method === "POST" && url.searchParams.has("delete")) {
        const body = await requestBody(request);
        const keys = [...body.toString("utf8").matchAll(/<Key>(.*?)<\/Key>/g)];
        for (const match of keys) {
          if (match[1]) objects.delete(match[1].replace(/&amp;/g, "&"));
        }
        respond(response, 200, "<DeleteResult/>");
        return;
      }
      if (request.method === "PUT" && request.headers["x-amz-copy-source"]) {
        if (failures.copy) {
          respond(response, 400, "<Error><Code>InvalidRequest</Code></Error>");
          return;
        }
        const source = decodeURIComponent(String(request.headers["x-amz-copy-source"]).replace(/^\//, ""));
        const [, ...sourceParts] = source.split("/");
        const sourceKey = sourceParts.join("/");
        const stored = objects.get(sourceKey);
        if (!stored) {
          respond(response, 404, "<Error><Code>NoSuchKey</Code></Error>");
          return;
        }
        objects.set(key, { ...stored });
        respond(response, 200, "<CopyObjectResult><ETag>&quot;test&quot;</ETag></CopyObjectResult>");
        return;
      }
      if (request.method === "PUT") {
        if (failures.put) {
          respond(response, 400, "<Error><Code>InvalidRequest</Code></Error>");
          return;
        }
        objects.set(key, {
          body: await requestBody(request),
          contentType: String(request.headers["content-type"] ?? "application/octet-stream"),
          cacheControl: String(request.headers["cache-control"] ?? ""),
        });
        response.setHeader("ETag", '"test"');
        respond(response, 200);
        return;
      }
      if ((request.method === "GET" || request.method === "HEAD") && key) {
        const stored = objects.get(key);
        if (!stored) {
          respond(response, 404, "<Error><Code>NoSuchKey</Code></Error>");
          return;
        }
        response.setHeader("Content-Type", stored.contentType);
        response.setHeader("Cache-Control", stored.cacheControl);
        respond(response, 200, request.method === "HEAD" ? "" : stored.body.toString("utf8"));
        return;
      }
      respond(response, 200, "<ListBucketResult><IsTruncated>false</IsTruncated></ListBucketResult>");
    } catch {
      respond(response, 500, "<Error><Code>InternalError</Code></Error>");
    }
  });
  await new Promise<void>((resolveListen, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolveListen);
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("S3 test server did not start");
  const client = new S3Client({
    endpoint: `http://127.0.0.1:${address.port}`,
    region: "auto",
    forcePathStyle: true,
    credentials: { accessKeyId: "test-access-key", secretAccessKey: "test-secret-key" },
  });
  return {
    client,
    failures,
    objects,
    close: async () => {
      client.destroy();
      await new Promise<void>((resolveClose, reject) => {
        server.close((error) => error ? reject(error) : resolveClose());
      });
    },
  };
}

test("S3 storage supports private staging, immutable publication, rollback, and unpublish", async () => {
  const fixture = await makeS3Fixture();
  const root = await mkdtemp(resolve(tmpdir(), "playworks-s3-test-"));
  const source = resolve(root, "source");
  const assetId = "123e4567-e89b-42d3-a456-426614174000";
  const files: GameStorageFile[] = [
    { path: "index.html", size: Buffer.byteLength("<title>S3 game</title>") },
    { path: "playworks.json", size: Buffer.byteLength('{"version":1,"entry":"index.html"}') },
  ];
  const storage = new S3GameAssetStorage(fixture.client, "test-bucket");
  try {
    await mkdir(source);
    await writeFile(resolve(source, "index.html"), "<title>S3 game</title>");
    await writeFile(resolve(source, "playworks.json"), '{"version":1,"entry":"index.html"}');
    await storage.stagePackage(assetId, source, files);
    assert.equal(fixture.objects.has(`staging/${assetId}/index.html`), true);
    assert.equal(fixture.objects.get(`staging/${assetId}/index.html`)?.cacheControl, "private, no-store");
    assert.equal(await storage.getPublishedObject(assetId, "index.html"), null);

    assert.equal(await storage.publishPackage(assetId), true);
    assert.equal(await storage.publishPackage(assetId), false);
    assert.equal((await storage.getPublishedObject(assetId, "index.html"))?.body.toString(), "<title>S3 game</title>");
    assert.equal(await storage.getPublishedObject(assetId, "playworks.json"), null);

    await storage.unpublishPackage(assetId);
    assert.equal(await storage.getPublishedObject(assetId, "index.html"), null);
    assert.equal((await storage.getStagedObject(assetId, "index.html"))?.body.toString(), "<title>S3 game</title>");
    assert.equal(await storage.publishPackage(assetId), true);

    await storage.discardStagedPackage(assetId);
    assert.equal(await storage.getStagedObject(assetId, "index.html"), null);
  } finally {
    await fixture.close();
    await rm(root, { recursive: true, force: true });
  }
});

test("S3 storage failures surface and partial publication is removed", async () => {
  const fixture = await makeS3Fixture();
  const root = await mkdtemp(resolve(tmpdir(), "playworks-s3-failure-"));
  const source = resolve(root, "source");
  const assetId = "123e4567-e89b-42d3-a456-426614174001";
  const indexHtml = "<title>Failure test</title>";
  const script = "globalThis.gameLoaded = true;";
  const files: GameStorageFile[] = [
    { path: "index.html", size: Buffer.byteLength(indexHtml) },
    { path: "assets/main.js", size: Buffer.byteLength(script) },
  ];
  const storage = new S3GameAssetStorage(fixture.client, "test-bucket");
  try {
    await mkdir(source);
    await mkdir(resolve(source, "assets"));
    await writeFile(resolve(source, "index.html"), indexHtml);
    await writeFile(resolve(source, "assets", "main.js"), script);
    fixture.failures.put = true;
    await assert.rejects(storage.stagePackage(assetId, source, files));
    assert.equal([...fixture.objects.keys()].some((key) => key.startsWith(`staging/${assetId}/`)), false);

    fixture.failures.put = false;
    await storage.stagePackage(assetId, source, files);
    fixture.objects.set(`packages/${assetId}/index.html`, {
      body: Buffer.from(indexHtml),
      contentType: "text/html; charset=utf-8",
      cacheControl: "private, no-store",
    });
    assert.equal(await storage.publishPackage(assetId), true);
    assert.equal((await storage.getPublishedObject(assetId, "assets/main.js"))?.body.toString(), script);
    assert.equal(await storage.publishPackage(assetId), false);

    await storage.unpublishPackage(assetId);
    fixture.failures.copy = true;
    await assert.rejects(storage.publishPackage(assetId));
    assert.equal([...fixture.objects.keys()].some((key) => key.startsWith(`packages/${assetId}/`)), false);
    fixture.failures.copy = false;
    assert.equal((await storage.getStagedObject(assetId, "index.html"))?.body.toString(), indexHtml);
  } finally {
    await fixture.close();
    await rm(root, { recursive: true, force: true });
  }
});
