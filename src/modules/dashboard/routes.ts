import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import { getDashboardStats } from "./service";
import { HttpStatus } from "../../shared/http/status";
import { serverError } from "../../shared/http/response";
import { authenticate } from "../../plugins/auth.plugin";
import { requirePermission } from "../../plugins/permission.plugin";

const getDashboardStatsHandler = async (req: FastifyRequest, res: FastifyReply) => {
  try {
    const result = await getDashboardStats(req);
    res.status(result?.success?.code || result?.error?.code || HttpStatus.OK).send(result);
  } catch (error) {
    console.log("Error:- ", error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).send(serverError(error));
  }
};

export const dashboardRoutes: FastifyPluginAsync = async (app) => {
  app.get("/", { preHandler: [authenticate, requirePermission("dashboard_view")] }, getDashboardStatsHandler);
};
