import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { listPermissions, listRoles, createRole, updateRole, deleteRole } from "./service";
import { validate } from "../../shared/http/validate";
import { HttpStatus } from "../../shared/http/status";
import { serverError } from "../../shared/http/response";
import { authenticate } from "../../plugins/auth.plugin";
import { requirePermission } from "../../plugins/permission.plugin";

const CreateRoleSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(255).optional().nullable(),
  permission_ids: z.array(z.number().int().positive()),
});

const UpdateRoleSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(255).optional().nullable(),
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

const listRolesHandler = async (req: FastifyRequest, res: FastifyReply) => {
  try {
    const result = await listRoles(req);
    res.status(result?.success?.code || result?.error?.code || HttpStatus.OK).send(result);
  } catch (error) {
    console.log("Error:- ", error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).send(serverError(error));
  }
};

const createRoleHandler = async (req: FastifyRequest, res: FastifyReply) => {
  try {
    const result = await createRole(req);
    res.status(result?.success?.code || result?.error?.code || HttpStatus.OK).send(result);
  } catch (error) {
    console.log("Error:- ", error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).send(serverError(error));
  }
};

const updateRoleHandler = async (req: FastifyRequest, res: FastifyReply) => {
  try {
    const result = await updateRole(req);
    res.status(result?.success?.code || result?.error?.code || HttpStatus.OK).send(result);
  } catch (error) {
    console.log("Error:- ", error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).send(serverError(error));
  }
};

const deleteRoleHandler = async (req: FastifyRequest, res: FastifyReply) => {
  try {
    const result = await deleteRole(req);
    res.status(result?.success?.code || result?.error?.code || HttpStatus.OK).send(result);
  } catch (error) {
    console.log("Error:- ", error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).send(serverError(error));
  }
};

export const roleRoutes: FastifyPluginAsync = async (app) => {
  app.get("/permissions", { preHandler: [authenticate, requirePermission("role_manage")] }, listPermissionsHandler);
  app.get("/", { preHandler: [authenticate, requirePermission("role_manage")] }, listRolesHandler);
  app.post("/", { preHandler: [authenticate, requirePermission("role_manage"), validate(CreateRoleSchema)] }, createRoleHandler);
  app.put("/:id", { preHandler: [authenticate, requirePermission("role_manage"), validate(IdParamSchema, "params"), validate(UpdateRoleSchema)] }, updateRoleHandler);
  app.delete("/:id", { preHandler: [authenticate, requirePermission("role_manage"), validate(IdParamSchema, "params")] }, deleteRoleHandler);
};
