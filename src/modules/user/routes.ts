import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { listUsers, getUser, createUser, updateUser, toggleUserStatus, deleteUser } from "./service";
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

const CreateUserSchema = z.object({
  full_name: z.string().min(1).max(150),
  mobile_number: z.string().regex(/^\d{10,13}$/, "Mobile number must be 10-13 digits"),
  username: z.string().regex(/^[a-z_]+$/, "Username must contain only lowercase letters and underscore").min(4, "Username must be at least 4 characters").max(20, "Username must be at most 20 characters"),
  email: z.string().email().max(191),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const UpdateUserSchema = z.object({
  full_name: z.string().min(1).max(150).optional(),
  mobile_number: z.string().regex(/^\d{10,13}$/, "Mobile number must be 10-13 digits").optional(),
  username: z.string().regex(/^[a-z_]+$/, "Username must contain only lowercase letters and underscore").min(4, "Username must be at least 4 characters").max(20, "Username must be at most 20 characters").optional(),
  password: z.string().min(6, "Password must be at least 6 characters").optional(),
});

const IdParamSchema = z.object({
  id: z.string().regex(/^\d+$/).transform(Number),
});

const listUsersHandler = async (req: FastifyRequest, res: FastifyReply) => {
  try {
    const result = await listUsers(req);
    res.status(result?.success?.code || result?.error?.code || HttpStatus.OK).send(result);
  } catch (error) {
    console.log("Error:- ", error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).send(serverError(error));
  }
};

const getUserHandler = async (req: FastifyRequest, res: FastifyReply) => {
  try {
    const result = await getUser(req);
    res.status(result?.success?.code || result?.error?.code || HttpStatus.OK).send(result);
  } catch (error) {
    console.log("Error:- ", error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).send(serverError(error));
  }
};

const createUserHandler = async (req: FastifyRequest, res: FastifyReply) => {
  try {
    const result = await createUser(req);
    res.status(result?.success?.code || result?.error?.code || HttpStatus.OK).send(result);
  } catch (error) {
    console.log("Error:- ", error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).send(serverError(error));
  }
};

const updateUserHandler = async (req: FastifyRequest, res: FastifyReply) => {
  try {
    const result = await updateUser(req);
    res.status(result?.success?.code || result?.error?.code || HttpStatus.OK).send(result);
  } catch (error) {
    console.log("Error:- ", error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).send(serverError(error));
  }
};

const toggleUserStatusHandler = async (req: FastifyRequest, res: FastifyReply) => {
  try {
    const result = await toggleUserStatus(req);
    res.status(result?.success?.code || result?.error?.code || HttpStatus.OK).send(result);
  } catch (error) {
    console.log("Error:- ", error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).send(serverError(error));
  }
};

const deleteUserHandler = async (req: FastifyRequest, res: FastifyReply) => {
  try {
    const result = await deleteUser(req);
    res.status(result?.success?.code || result?.error?.code || HttpStatus.OK).send(result);
  } catch (error) {
    console.log("Error:- ", error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).send(serverError(error));
  }
};

export const userRoutes: FastifyPluginAsync = async (app) => {
  app.get("/", { preHandler: [authenticate, requirePermission("user_view"), validate(ListQuerySchema, "query")] }, listUsersHandler);
  app.get("/:id", { preHandler: [authenticate, requirePermission("user_view"), validate(IdParamSchema, "params")] }, getUserHandler);
  app.post("/", { preHandler: [authenticate, requirePermission("user_create"), validate(CreateUserSchema)] }, createUserHandler);
  app.put("/:id", { preHandler: [authenticate, requirePermission("user_update"), validate(IdParamSchema, "params"), validate(UpdateUserSchema)] }, updateUserHandler);
  app.patch("/:id/status", { preHandler: [authenticate, requirePermission("user_update"), validate(IdParamSchema, "params")] }, toggleUserStatusHandler);
  app.delete("/:id", { preHandler: [authenticate, requirePermission("user_delete"), validate(IdParamSchema, "params")] }, deleteUserHandler);
};
