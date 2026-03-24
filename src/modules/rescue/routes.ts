import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { listRescues, getRescue, updateRescue, updateRescueFull, updateRescueStatus, deleteRescue } from "./service";
import { validate } from "../../shared/http/validate";
import { HttpStatus } from "../../shared/http/status";
import { serverError } from "../../shared/http/response";
import { authenticate } from "../../plugins/auth.plugin";
import { requirePermission } from "../../plugins/permission.plugin";

const ListQuerySchema = z.object({
  page: z.string().default("1").transform(Number),
  limit: z.string().default("10").transform(Number),
  status: z.enum(["pending", "in_progress", "completed", "cancelled"]).optional(),
  animal_type: z.string().optional(),
  search: z.string().optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
});

const IdParamSchema = z.object({
  id: z.string().regex(/^\d+$/).transform(Number),
});

const UpdateRescueSchema = z.object({
  status: z.enum(["pending", "in_progress", "completed", "cancelled"]).optional(),
  animal_description: z.string().max(1000).optional(),
});

const UpdateStatusSchema = z.object({
  status: z.enum(["pending", "in_progress", "completed", "cancelled"]),
});

const handler = (fn: (req: FastifyRequest) => Promise<any>) => async (req: FastifyRequest, res: FastifyReply) => {
  try {
    const result = await fn(req);
    res.status(result?.success?.code || result?.error?.code || HttpStatus.OK).send(result);
  } catch (error) {
    console.log("Error:- ", error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).send(serverError(error));
  }
};

export const rescueRoutes: FastifyPluginAsync = async (app) => {
  app.get("/", { preHandler: [authenticate, requirePermission("rescue_view"), validate(ListQuerySchema, "query")] }, handler(listRescues));
  app.get("/:id", { preHandler: [authenticate, requirePermission("rescue_view"), validate(IdParamSchema, "params")] }, handler(getRescue));
  app.put("/:id", { preHandler: [authenticate, requirePermission("rescue_update"), validate(IdParamSchema, "params"), validate(UpdateRescueSchema)] }, handler(updateRescue));
  app.put("/:id/status", { preHandler: [authenticate, requirePermission("rescue_update"), validate(IdParamSchema, "params"), validate(UpdateStatusSchema)] }, handler(updateRescueStatus));
  // Full edit with file upload (multipart)
  app.post("/:id/edit", { preHandler: [authenticate, requirePermission("rescue_update"), validate(IdParamSchema, "params")] }, handler(updateRescueFull));
  app.delete("/:id", { preHandler: [authenticate, requirePermission("rescue_delete"), validate(IdParamSchema, "params")] }, handler(deleteRescue));
};
