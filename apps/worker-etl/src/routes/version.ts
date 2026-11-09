import { Hono } from "hono";
import { getActiveVersionMetadata } from "../db/repositories";
import type { Env } from "../index";

export const versionRoutes = new Hono<{ Bindings: Env }>();

versionRoutes.get("/version", async (c) => {
  const metadata = await getActiveVersionMetadata(c.env);

  if (!metadata) {
    return c.json({ error: "No hay versión activa." }, 404);
  }

  const etag = `"${metadata.hash}"`;
  c.header("Cache-Control", "no-cache");
  c.header("ETag", etag);

  if (c.req.header("If-None-Match") === etag) {
    return c.body(null, 304);
  }

  return c.json(metadata);
});
