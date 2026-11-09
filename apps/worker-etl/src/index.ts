import { Hono } from "hono";
import type { Env as EtlEnv } from "./etl/extract";

export interface Env extends EtlEnv {
  DB: D1Database;
}

const app = new Hono<{ Bindings: Env }>();

app.get("/api/health", (c) =>
  c.json({ status: "ok", service: "AgroDatos ETL" }),
);

export default app;
