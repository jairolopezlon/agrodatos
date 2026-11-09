import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Env as EtlEnv } from "./etl/extract";
import { runEtl } from "./etl/run";
import { apiRoutes } from "./routes/api";

export interface Env extends EtlEnv {
  DB: D1Database;
  PAGES_ORIGIN?: string;
  ADMIN_API_KEY?: string;
}

const app = new Hono<{ Bindings: Env }>();

app.use(
  "*",
  cors({
    origin: (origin, c) => {
      const allowed = c.env.PAGES_ORIGIN;

      if (!allowed || allowed === "*") {
        return "*";
      }

      if (origin === allowed) {
        return origin;
      }

      if (/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) {
        return origin;
      }

      return null;
    },
    allowMethods: ["GET", "HEAD", "POST", "OPTIONS"],
    allowHeaders: ["Authorization", "Content-Type", "If-None-Match"],
    exposeHeaders: ["ETag", "Content-Encoding", "Cache-Control"],
  }),
);

app.route("/api", apiRoutes);

export default {
  fetch: app.fetch,
  scheduled: async (
    _controller: ScheduledController,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<void> => {
    ctx.waitUntil(runEtl(env, "CRON"));
  },
};
