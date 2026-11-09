import { Hono } from "hono";
import type { Context } from "hono";
import {
  createEtlLog,
  getEtlLog,
  listEtlLogs,
} from "../db/repositories";
import { runEtlWithLog } from "../etl/run";
import type { Env } from "../index";

export const adminRoutes = new Hono<{ Bindings: Env }>();

async function safeEqual(a: string, b: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const [hashA, hashB] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(a)),
    crypto.subtle.digest("SHA-256", encoder.encode(b)),
  ]);
  const bytesA = new Uint8Array(hashA);
  const bytesB = new Uint8Array(hashB);
  let difference = 0;

  for (let index = 0; index < bytesA.length; index += 1) {
    difference |= bytesA[index] ^ bytesB[index];
  }

  return difference === 0;
}

async function requireAdmin(
  c: Context<{ Bindings: Env }>,
): Promise<Response | null> {
  const adminKey = c.env.ADMIN_API_KEY;

  if (!adminKey) {
    return c.json({ error: "ADMIN_API_KEY no configurada." }, 500);
  }

  const authorization = c.req.header("Authorization") ?? "";
  const token = authorization.startsWith("Bearer ")
    ? authorization.slice(7)
    : "";

  if (!(await safeEqual(token, adminKey))) {
    return c.json({ error: "No autorizado." }, 401);
  }

  return null;
}

adminRoutes.post("/admin/trigger", async (c) => {
  const unauthorized = await requireAdmin(c);

  if (unauthorized) {
    return unauthorized;
  }

  const etlLogId = await createEtlLog(c.env, "MANUAL");
  c.executionCtx.waitUntil(runEtlWithLog(c.env, etlLogId));

  return c.json({ etl_log_id: etlLogId, status: "RUNNING" }, 202);
});

adminRoutes.get("/admin/etl", async (c) => {
  const unauthorized = await requireAdmin(c);

  if (unauthorized) {
    return unauthorized;
  }

  const limit = Number(c.req.query("limit") ?? "20");
  const logs = await listEtlLogs(c.env, Number.isFinite(limit) ? limit : 20);

  return c.json(logs);
});

adminRoutes.get("/admin/etl/:id", async (c) => {
  const unauthorized = await requireAdmin(c);

  if (unauthorized) {
    return unauthorized;
  }

  const id = Number(c.req.param("id"));

  if (!Number.isInteger(id) || id <= 0) {
    return c.json({ error: "ID inválido." }, 400);
  }

  const log = await getEtlLog(c.env, id);

  if (!log) {
    return c.json({ error: `ETL log ${id} no encontrado.` }, 404);
  }

  return c.json(log);
});
