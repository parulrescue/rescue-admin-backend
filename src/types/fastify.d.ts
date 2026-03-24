import "fastify";
import type { Sequelize } from "sequelize-typescript";

declare module "fastify" {
  interface FastifyInstance {
    db: Sequelize;
  }

  interface FastifyRequest {
    requestId: string;
    adminId?: number;
    adminRole?: "admin" | "sub_admin";
    sessionId?: number;
  }

  interface FastifyReply {
    responseData?: unknown;
  }
}

export {};
