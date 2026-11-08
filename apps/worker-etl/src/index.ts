import { Hono } from "hono";

export interface Env {
  DB: D1Database;
}

const app = new Hono<{ Bindings: Env }>();

app.get("/api/health", (c) =>
  c.json({ status: "ok", service: "AgroDatos ETL" }),
);

export default app;
