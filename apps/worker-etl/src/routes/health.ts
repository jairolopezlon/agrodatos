import { Hono } from "hono";
import type { Env } from "../index";

export const healthRoutes = new Hono<{ Bindings: Env }>();

healthRoutes.get("/health", (c) =>
  c.json({ status: "ok", service: "AgroDatos ETL" }),
);
