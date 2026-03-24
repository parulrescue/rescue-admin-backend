import type { FastifyReply, FastifyRequest, preHandlerHookHandler } from "fastify";
import { verifyToken } from "../shared/security/jwt";
import { Session } from "../db/models/auth/session.model";
import { HttpStatus } from "../shared/http/status";
import { error } from "../shared/http/response";
import { Op } from "sequelize";
import { AdminUser } from "../db/models/auth/admin-user.model";

export const authenticate: preHandlerHookHandler = async (
  req: FastifyRequest,
  reply: FastifyReply
) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;

    if (!token) {
      return reply.status(HttpStatus.UNAUTHORIZED).send(
        error(HttpStatus.UNAUTHORIZED, "Authentication required")
      );
    }

    const payload = verifyToken(token);

    const admin = await AdminUser.findByPk(payload.adminId);
    if (!admin) {
      return reply.status(HttpStatus.UNAUTHORIZED).send(
        error(HttpStatus.UNAUTHORIZED, "Admin not found")
      );
    }

    // Verify session is active and not expired in DB
    const session = await Session.findOne({
      where: {
        id: payload.sessionId,
        user_id: payload.adminId,
        user_type: "admin",
        is_active: true,
        expires_at: { [Op.gt]: new Date() },
      },
      raw: true,
    });

    if (!session) {
      return reply.status(HttpStatus.UNAUTHORIZED).send(
        error(HttpStatus.UNAUTHORIZED, "Session expired or revoked")
      );
    }

    req.adminId = payload.adminId;
    req.adminRole = payload.adminRole;
    req.sessionId = payload.sessionId;
  } catch (err) {
    return reply.status(HttpStatus.UNAUTHORIZED).send(
      error(HttpStatus.UNAUTHORIZED, "Invalid or expired token")
    );
  }
};
