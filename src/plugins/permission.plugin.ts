import type { FastifyReply, FastifyRequest, preHandlerHookHandler } from "fastify";
import { HttpStatus } from "../shared/http/status";
import { error } from "../shared/http/response";
import { AdminUser } from "../db/models/auth/admin-user.model";
import { AdminPermission } from "../db/models/permission/admin-permission.model";
import { Permission } from "../db/models/permission/permission.model";

/**
 * Permission middleware — direct check through admin_permissions + permissions tables.
 * If admin_users.role = 'admin', all permissions are granted automatically.
 * For sub_admin, queries: admin_permissions → permissions.
 */
export function requirePermission(permissionKey: string): preHandlerHookHandler {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    // Admin role bypasses all permission checks
    if (req.adminRole === "admin") {
      return;
    }

    // Direct permission check: JOIN admin_permissions + permissions
    const permission = await AdminPermission.findOne({
      where: { admin_id: req.adminId },
      include: [
        {
          model: Permission,
          where: { key: permissionKey },
          attributes: ["key"],
        },
      ],
      raw: true,
      nest: true,
    });

    if (!permission) {
      return reply.status(HttpStatus.FORBIDDEN).send(
        error(HttpStatus.FORBIDDEN, `Permission '${permissionKey}' denied`)
      );
    }
  };
}

/**
 * Hard-check: only admin_users.role = 'admin' can access.
 * Sub-admins are blocked regardless of their assigned role permissions.
 */
export const requireAdmin: preHandlerHookHandler = async (
  req: FastifyRequest,
  reply: FastifyReply
) => {
  if (req.adminRole === "admin") {
    return;
  }

  // Double-check from DB
  const adminUser = await AdminUser.findByPk(req.adminId, {
    attributes: ["role"],
    raw: true,
  });

  if (!adminUser || adminUser.role !== "admin") {
    return reply.status(HttpStatus.FORBIDDEN).send(
      error(HttpStatus.FORBIDDEN, "Admin access only. Sub-admins cannot access this resource.")
    );
  }
};
