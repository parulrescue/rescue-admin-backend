import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import { GetExportHistoryQuerySchema, GetAvailableDatesQuerySchema, FilterLogsQuerySchema } from "./dto";
import { getExportHistory, getAvailableDates, getAvailableEnvironments, filterLogs } from "./service";
import { validate } from "../../shared/http/validate";
import { HttpStatus } from "../../shared/http/status";
import { serverError } from "../../shared/http/response";

const getExportHistoryHandler = async (req: FastifyRequest, res: FastifyReply) => {
  try {
    const result = await getExportHistory(req);
    res.status(result?.success?.code || result?.error?.code || HttpStatus.OK).send(result);
  } catch (err) {
    console.error("Get export history error:", err);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).send(serverError(err));
  }
};

const getAvailableDatesHandler = async (req: FastifyRequest, res: FastifyReply) => {
  try {
    const result = await getAvailableDates(req);
    res.status(result?.success?.code || result?.error?.code || HttpStatus.OK).send(result);
  } catch (err) {
    console.error("Get available dates error:", err);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).send(serverError(err));
  }
};

const getAvailableEnvironmentsHandler = async (_req: FastifyRequest, res: FastifyReply) => {
  try {
    const result = await getAvailableEnvironments();
    res.status(result?.success?.code || result?.error?.code || HttpStatus.OK).send(result);
  } catch (err) {
    console.error("Get available environments error:", err);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).send(serverError(err));
  }
};

const filterLogsHandler = async (req: FastifyRequest, res: FastifyReply) => {
  try {
    const result = await filterLogs(req);
    res.status(result?.success?.code || result?.error?.code || HttpStatus.OK).send(result);
  } catch (err) {
    console.error("Filter logs error:", err);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).send(serverError(err));
  }
};

export const logExportRoutes: FastifyPluginAsync = async (app) => {

  // Get export history from database
  app.get("/history", { preHandler: validate({ query: GetExportHistoryQuerySchema }) }, getExportHistoryHandler);

  // Get available log dates
  app.get("/dates", { preHandler: validate({ query: GetAvailableDatesQuerySchema }) }, getAvailableDatesHandler);

  // Get available environments
  app.get("/environments", getAvailableEnvironmentsHandler);

  // Filter logs by date and level, return JSON
  app.get("/filter", { preHandler: validate({ query: FilterLogsQuerySchema }) }, filterLogsHandler);
};
