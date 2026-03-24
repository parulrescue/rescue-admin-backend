import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { listSubAdmins, createSubAdmin, updateSubAdmin, toggleSubAdminStatus, deleteSubAdmin, listPermissions } from "./service";
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

const CreateSubAdminSchema = z.object({
  full_name: z.string().min(1).max(150),
  mobile_number: z.string().regex(/^\d{10,13}$/, "Mobile number must be 10-13 digits"),
  username: z.string().regex(/^[a-z_]+$/, "Username must contain only lowercase letters and underscore").min(4, "Username must be at least 4 characters").max(20, "Username must be at most 20 characters"),
  email: z.string().email().max(191),
  password: z.string().min(6, "Password must be at least 6 characters"),
  permission_ids: z.array(z.number().int().positive()).optional(),
});

const UpdateSubAdminSchema = z.object({
  full_name: z.string().min(1).max(150).optional(),
  mobile_number: z.string().regex(/^\d{10,13}$/, "Mobile number must be 10-13 digits").optional(),
  username: z.string().regex(/^[a-z_]+$/, "Username must contain only lowercase letters and underscore").min(4, "Username must be at least 4 characters").max(20, "Username must be at most 20 characters").optional(),
  password: z.string().min(6, "Password must be at least 6 characters").optional(),
  permission_ids: z.array(z.number().int().positive()).optional(),
});

const IdParamSchema = z.object({
  id: z.string().regex(/^\d+$/).transform(Number),
});

const listPermissionsHandler = async (req: FastifyRequest, res: FastifyReply) => {
  try {
    const result = await listPermissions(req);
    res.status(result?.success?.code || result?.error?.code || HttpStatus.OK).send(result);
  } catch (error) {
    console.log("Error:- ", error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).send(serverError(error));
  }
};

const listSubAdminsHandler = async (req: FastifyRequest, res: FastifyReply) => {
  try {
    const result = await listSubAdmins(req);
    res.status(result?.success?.code || result?.error?.code || HttpStatus.OK).send(result);
  } catch (error) {
    console.log("Error:- ", error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).send(serverError(error));
  }
};

const createSubAdminHandler = async (req: FastifyRequest, res: FastifyReply) => {
  try {
    const result = await createSubAdmin(req);
    res.status(result?.success?.code || result?.error?.code || HttpStatus.OK).send(result);
  } catch (error) {
    console.log("Error:- ", error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).send(serverError(error));
  }
};

const updateSubAdminHandler = async (req: FastifyRequest, res: FastifyReply) => {
  try {
    const result = await updateSubAdmin(req);
    res.status(result?.success?.code || result?.error?.code || HttpStatus.OK).send(result);
  } catch (error) {
    console.log("Error:- ", error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).send(serverError(error));
  }
};

const toggleSubAdminStatusHandler = async (req: FastifyRequest, res: FastifyReply) => {
  try {
    const result = await toggleSubAdminStatus(req);
    res.status(result?.success?.code || result?.error?.code || HttpStatus.OK).send(result);
  } catch (error) {
    console.log("Error:- ", error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).send(serverError(error));
  }
};

const deleteSubAdminHandler = async (req: FastifyRequest, res: FastifyReply) => {
  try {
    const result = await deleteSubAdmin(req);
    res.status(result?.success?.code || result?.error?.code || HttpStatus.OK).send(result);
  } catch (error) {
    console.log("Error:- ", error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).send(serverError(error));
  }
};

export const subAdminRoutes: FastifyPluginAsync = async (app) => {
  app.get("/permissions", { preHandler: [authenticate, requirePermission("sub_admin_view")] }, listPermissionsHandler);
  app.get("/", { preHandler: [authenticate, requirePermission("sub_admin_view"), validate(ListQuerySchema, "query")] }, listSubAdminsHandler);
  app.post("/", { preHandler: [authenticate, requirePermission("sub_admin_create"), validate(CreateSubAdminSchema)] }, createSubAdminHandler);
  app.put("/:id", { preHandler: [authenticate, requirePermission("sub_admin_update"), validate(IdParamSchema, "params"), validate(UpdateSubAdminSchema)] }, updateSubAdminHandler);
  app.patch("/:id/status", { preHandler: [authenticate, requirePermission("sub_admin_update"), validate(IdParamSchema, "params")] }, toggleSubAdminStatusHandler);
  app.delete("/:id", { preHandler: [authenticate, requirePermission("sub_admin_delete"), validate(IdParamSchema, "params")] }, deleteSubAdminHandler);
};
