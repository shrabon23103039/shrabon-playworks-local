import { serveGameAsset, type GameOriginEnvironment } from "../../src/serve.js";

type PagesContext = { request: Request; env: GameOriginEnvironment };

export function onRequest(context: PagesContext): Promise<Response> {
  return serveGameAsset(context.request, context.env, "published");
}
