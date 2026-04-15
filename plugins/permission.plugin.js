"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAdmin = void 0;
exports.requirePermission = requirePermission;
const status_1 = require("../shared/http/status");
const response_1 = require("../shared/http/response");
const admin_user_model_1 = require("../db/models/auth/admin-user.model");
const admin_permission_model_1 = require("../db/models/permission/admin-permission.model");
const permission_model_1 = require("../db/models/permission/permission.model");
/**
 * Permission middleware — direct check through admin_permissions + permissions tables.
 * If admin_users.role = 'admin', all permissions are granted automatically.
 * For sub_admin, queries: admin_permissions → permissions.
 */
function requirePermission(permissionKey) {
    return async (req, reply) => {
        // Admin role bypasses all permission checks
        if (req.adminRole === "admin") {
            return;
        }
        // Direct permission check: JOIN admin_permissions + permissions
        const permission = await admin_permission_model_1.AdminPermission.findOne({
            where: { admin_id: req.adminId },
            include: [
                {
                    model: permission_model_1.Permission,
                    where: { key: permissionKey },
                    attributes: ["key"],
                },
            ],
            raw: true,
            nest: true,
        });
        if (!permission) {
            return reply.status(status_1.HttpStatus.FORBIDDEN).send((0, response_1.error)(status_1.HttpStatus.FORBIDDEN, `Permission '${permissionKey}' denied`));
        }
    };
}
/**
 * Hard-check: only admin_users.role = 'admin' can access.
 * Sub-admins are blocked regardless of their assigned role permissions.
 */
const requireAdmin = async (req, reply) => {
    if (req.adminRole === "admin") {
        return;
    }
    // Double-check from DB
    const adminUser = await admin_user_model_1.AdminUser.findByPk(req.adminId, {
        attributes: ["role"],
        raw: true,
    });
    if (!adminUser || adminUser.role !== "admin") {
        return reply.status(status_1.HttpStatus.FORBIDDEN).send((0, response_1.error)(status_1.HttpStatus.FORBIDDEN, "Admin access only. Sub-admins cannot access this resource."));
    }
};
exports.requireAdmin = requireAdmin;
