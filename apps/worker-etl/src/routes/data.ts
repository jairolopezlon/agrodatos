import { Hono } from "hono";
import { getVersionMetadata, getVersionPayload } from "../db/repositories";
import type { Env } from "../index";

export const dataRoutes = new Hono<{ Bindings: Env }>();

dataRoutes.on(["GET", "HEAD"], "/data/:versionId", async (c) => {
  const versionId = c.req.param("versionId");
  const metadata = await getVersionMetadata(c.env, versionId);

  if (!metadata) {
    return c.json({ error: `Versión ${versionId} no encontrada.` }, 404);
  }

  const etag = `"${metadata.hash}"`;
  const headers = new Headers({
    "Cache-Control": "public, max-age=31536000, immutable",
    ETag: etag,
  });

  if (c.req.header("If-None-Match") === etag) {
    return new Response(null, { status: 304, headers });
  }

  if (c.req.method === "HEAD") {
    return new Response(null, { status: 200, headers });
  }

  const payload = await getVersionPayload(c.env, versionId);

  if (!payload) {
    return c.json(
      { error: `Payload de la versión ${versionId} no encontrado.` },
      404,
    );
  }

  headers.set("Content-Type", "application/json");
  headers.set("Content-Encoding", "gzip");

  return new Response(payload, {
    status: 200,
    headers,
    encodeBody: "manual",
  });
});
