import { Hono } from "hono";
import type { Env } from "../index";
import { adminRoutes } from "./admin";
import { dataRoutes } from "./data";
import { healthRoutes } from "./health";
import { versionRoutes } from "./version";

export const apiRoutes = new Hono<{ Bindings: Env }>();

apiRoutes.route("/", healthRoutes);
apiRoutes.route("/", versionRoutes);
apiRoutes.route("/", dataRoutes);
apiRoutes.route("/", adminRoutes);
