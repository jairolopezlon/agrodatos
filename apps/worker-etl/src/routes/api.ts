import { Hono } from "hono";
import type { Env } from "../index";
import { dataRoutes } from "./data";
import { healthRoutes } from "./health";
import { versionRoutes } from "./version";

export const apiRoutes = new Hono<{ Bindings: Env }>();

apiRoutes.route("/", healthRoutes);
apiRoutes.route("/", versionRoutes);
apiRoutes.route("/", dataRoutes);
