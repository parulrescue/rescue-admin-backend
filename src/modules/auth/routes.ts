import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import {
  LoginBodySchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
  ChangePasswordSchema,
  SessionIdParamSchema,
} from "./dto";
import {
  seedAdmin,
  loginAdmin,
  logoutAdmin,
  getAdminSessions,
  revokeAdminSession,
  forgotAdminPassword,
  resetAdminPassword,
  changeAdminPassword,
} from "./service";
import { validate } from "../../shared/http/validate";
import { HttpStatus } from "../../shared/http/status";
import { serverError } from "../../shared/http/response";
import { authenticate } from "../../plugins/auth.plugin";

const seedHandler = async (req: FastifyRequest, res: FastifyReply) => {
  try {
    const result = await seedAdmin(req);
    res.status(result?.success?.code || result?.error?.code || HttpStatus.OK).send(result);
  } catch (error) {
    console.log("Error:- ", error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).send(serverError(error));
  }
};

const loginHandler = async (req: FastifyRequest, res: FastifyReply) => {
  try {
    const result = await loginAdmin(req);
    res.status(result?.success?.code || result?.error?.code || HttpStatus.OK).send(result);
  } catch (error) {
    console.log("Error:- ", error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).send(serverError(error));
  }
};

const logoutHandler = async (req: FastifyRequest, res: FastifyReply) => {
  try {
    const result = await logoutAdmin(req);
    res.status(result?.success?.code || result?.error?.code || HttpStatus.OK).send(result);
  } catch (error) {
    console.log("Error:- ", error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).send(serverError(error));
  }
};

const getSessionsHandler = async (req: FastifyRequest, res: FastifyReply) => {
  try {
    const result = await getAdminSessions(req);
    res.status(result?.success?.code || result?.error?.code || HttpStatus.OK).send(result);
  } catch (error) {
    console.log("Error:- ", error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).send(serverError(error));
  }
};

const revokeSessionHandler = async (req: FastifyRequest, res: FastifyReply) => {
  try {
    const result = await revokeAdminSession(req);
    res.status(result?.success?.code || result?.error?.code || HttpStatus.OK).send(result);
  } catch (error) {
    console.log("Error:- ", error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).send(serverError(error));
  }
};

const forgotPasswordHandler = async (req: FastifyRequest, res: FastifyReply) => {
  try {
    const result = await forgotAdminPassword(req);
    res.status(result?.success?.code || result?.error?.code || HttpStatus.OK).send(result);
  } catch (error) {
    console.log("Error:- ", error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).send(serverError(error));
  }
};

const resetPasswordHandler = async (req: FastifyRequest, res: FastifyReply) => {
  try {
    const result = await resetAdminPassword(req);
    res.status(result?.success?.code || result?.error?.code || HttpStatus.OK).send(result);
  } catch (error) {
    console.log("Error:- ", error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).send(serverError(error));
  }
};

const changePasswordHandler = async (req: FastifyRequest, res: FastifyReply) => {
  try {
    const result = await changeAdminPassword(req);
    res.status(result?.success?.code || result?.error?.code || HttpStatus.OK).send(result);
  } catch (error) {
    console.log("Error:- ", error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).send(serverError(error));
  }
};

export const authRoutes: FastifyPluginAsync = async (app) => {
  app.get("/seed", seedHandler);
  app.post("/login", { preHandler: validate(LoginBodySchema) }, loginHandler);
  app.post("/logout", { preHandler: authenticate }, logoutHandler);
  app.get("/sessions", { preHandler: authenticate }, getSessionsHandler);
  app.delete("/sessions/:id", { preHandler: [authenticate, validate(SessionIdParamSchema, "params")] }, revokeSessionHandler);
  app.post("/forgot-password", { preHandler: validate(ForgotPasswordSchema) }, forgotPasswordHandler);
  app.post("/reset-password", { preHandler: validate(ResetPasswordSchema) }, resetPasswordHandler);
  app.post("/change-password", { preHandler: [authenticate, validate(ChangePasswordSchema)] }, changePasswordHandler);
};
