"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = void 0;
const jwt_1 = require("../shared/security/jwt");
const session_model_1 = require("../db/models/auth/session.model");
const status_1 = require("../shared/http/status");
const response_1 = require("../shared/http/response");
const sequelize_1 = require("sequelize");
const admin_user_model_1 = require("../db/models/auth/admin-user.model");
const authenticate = async (req, reply) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
        if (!token) {
            return reply.status(status_1.HttpStatus.UNAUTHORIZED).send((0, response_1.error)(status_1.HttpStatus.UNAUTHORIZED, "Authentication required"));
        }
        const payload = (0, jwt_1.verifyToken)(token);
        const admin = await admin_user_model_1.AdminUser.findByPk(payload.adminId);
        if (!admin) {
            return reply.status(status_1.HttpStatus.UNAUTHORIZED).send((0, response_1.error)(status_1.HttpStatus.UNAUTHORIZED, "Admin not found"));
        }
        // Verify session is active and not expired in DB
        const session = await session_model_1.Session.findOne({
            where: {
                id: payload.sessionId,
                user_id: payload.adminId,
                user_type: "admin",
                is_active: true,
                expires_at: { [sequelize_1.Op.gt]: new Date() },
            },
            raw: true,
        });
        if (!session) {
            return reply.status(status_1.HttpStatus.UNAUTHORIZED).send((0, response_1.error)(status_1.HttpStatus.UNAUTHORIZED, "Session expired or revoked"));
        }
        req.adminId = payload.adminId;
        req.adminRole = payload.adminRole;
        req.sessionId = payload.sessionId;
    }
    catch (err) {
        return reply.status(status_1.HttpStatus.UNAUTHORIZED).send((0, response_1.error)(status_1.HttpStatus.UNAUTHORIZED, "Invalid or expired token"));
    }
};
exports.authenticate = authenticate;
