import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { listToAddresses, getToAddress, createToAddress, updateToAddress, toggleToAddressStatus, deleteToAddress } from "./service";
import { validate } from "../../shared/http/validate";
import { HttpStatus } from "../../shared/http/status";
import { serverError } from "../../shared/http/response";
import { authenticate } from "../../plugins/auth.plugin";
import { requirePermission } from "../../plugins/permission.plugin";

const ListQuerySchema = z.object({
  page: z.string().default("1").transform(Number),
  limit: z.string().default("20").transform(Number),
  search: z.string().optional(),
});

const CreateSchema = z.object({
  title: z.string().min(1).max(200),
  address: z.string().min(1),
  pincode: z.string().regex(/^\d*$/, "Pincode must be digits only").max(6).optional(),
  area: z.string().max(200).optional(),
});

const UpdateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  address: z.string().min(1).optional(),
  pincode: z.string().regex(/^\d*$/, "Pincode must be digits only").max(6).optional(),
  area: z.string().max(200).optional(),
});

const IdParamSchema = z.object({
  id: z.string().regex(/^\d+$/).transform(Number),
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

export const toAddressRoutes: FastifyPluginAsync = async (app) => {
  app.get("/", { preHandler: [authenticate, requirePermission("rescue_view"), validate(ListQuerySchema, "query")] }, handler(listToAddresses));
  app.get("/:id", { preHandler: [authenticate, requirePermission("rescue_view"), validate(IdParamSchema, "params")] }, handler(getToAddress));
  app.post("/", { preHandler: [authenticate, requirePermission("rescue_create"), validate(CreateSchema)] }, handler(createToAddress));
  app.put("/:id", { preHandler: [authenticate, requirePermission("rescue_update"), validate(IdParamSchema, "params"), validate(UpdateSchema)] }, handler(updateToAddress));
  app.patch("/:id/status", { preHandler: [authenticate, requirePermission("rescue_update"), validate(IdParamSchema, "params")] }, handler(toggleToAddressStatus));
  app.delete("/:id", { preHandler: [authenticate, requirePermission("rescue_delete"), validate(IdParamSchema, "params")] }, handler(deleteToAddress));
};
