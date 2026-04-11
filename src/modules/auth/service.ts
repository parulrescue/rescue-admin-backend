import { FastifyRequest } from "fastify";
import { Op } from "sequelize";
import { AdminUser } from "../../db/models/auth/admin-user.model";
import { AdminPermission } from "../../db/models/permission/admin-permission.model";
import { Permission } from "../../db/models/permission/permission.model";
import { Session } from "../../db/models/auth/session.model";
import { PasswordResetToken } from "../../db/models/auth/password-reset-token.model";
import { hashPassword, verifyPassword } from "../../shared/security/password";
import { generateToken, hashToken, getExpiryDate } from "../../shared/security/jwt";
import { generateResetToken, hashResetToken, encryptAES } from "../../shared/security/crypto";
import { sendPasswordResetEmail } from "../../services/email.service";
import { success, error } from "../../shared/http/response";
import { HttpStatus } from "../../shared/http/status";
import { config } from "../../config";

const DEFAULT_PERMISSIONS = [
  // Dashboard
  { key: "dashboard_view", module: "dashboard", description: "View dashboard statistics" },
  // User management
  { key: "user_view", module: "user", description: "View users list and details" },
  { key: "user_create", module: "user", description: "Create new users" },
  { key: "user_update", module: "user", description: "Edit existing users" },
  { key: "user_delete", module: "user", description: "Deactivate or delete users" },
  // Sub-admin management
  { key: "sub_admin_view", module: "sub_admin", description: "View sub-admins list" },
  { key: "sub_admin_create", module: "sub_admin", description: "Create new sub-admins" },
  { key: "sub_admin_update", module: "sub_admin", description: "Edit sub-admins and permissions" },
  { key: "sub_admin_delete", module: "sub_admin", description: "Deactivate or delete sub-admins" },
  // Rescue management
  { key: "rescue_view", module: "rescue", description: "View rescues list and details" },
  { key: "rescue_update", module: "rescue", description: "Edit rescue records" },
  { key: "rescue_delete", module: "rescue", description: "Delete rescue records" },
  // Animal management
  { key: "animal_view", module: "animal", description: "View animals list" },
  { key: "animal_create", module: "animal", description: "Create new animals" },
  { key: "animal_update", module: "animal", description: "Edit animals" },
  { key: "animal_delete", module: "animal", description: "Delete animals" },
];

// Old keys that may exist in DB → correct key
const LEGACY_KEY_MAP: Record<string, string> = {
  user_read: "user_view",
  user_manage: "user_view",
  rescue_read: "rescue_view",
  rescue_manage: "rescue_view",
  animal_read: "animal_view",
  animal_manage: "animal_view",
  sub_admin_read: "sub_admin_view",
  subadmin_manage: "sub_admin_view",
  subadmin_view: "sub_admin_view",
  dashboard_read: "dashboard_view",
};

async function migrateLegacyPermissions() {
  for (const [oldKey, newKey] of Object.entries(LEGACY_KEY_MAP)) {
    const oldPerm = await Permission.findOne({ where: { key: oldKey } });
    if (!oldPerm) continue;

    const newPerm = await Permission.findOne({ where: { key: newKey } });
    if (newPerm) {
      // Move assignments from old → new, then delete old
      await AdminPermission.update(
        { permission_id: newPerm.id },
        { where: { permission_id: oldPerm.id } }
      );
      await oldPerm.destroy();
    } else {
      // Rename old to new
      await oldPerm.update({ key: newKey });
    }
  }
}

async function seedDefaultPermissions() {
  // Clean up legacy permission keys first
  await migrateLegacyPermissions();

  let created = 0;
  for (const perm of DEFAULT_PERMISSIONS) {
    const [, wasCreated] = await Permission.findOrCreate({
      where: { key: perm.key },
      defaults: perm,
    });
    if (wasCreated) created++;
  }
  return created;
}

export async function seedAdmin(req: FastifyRequest) {
  try {
    // Always seed permissions
    const permCount = await seedDefaultPermissions();

    const existing = await AdminUser.findOne({ where: { role: "admin" }, raw: true });
    if (existing) {
      return success("Seed complete", { admin: "already exists", permissions_created: permCount });
    }

    const passwordHash = await hashPassword("parul@123");
    const passwordPlain = encryptAES("parul@123");

    const admin = await AdminUser.create({
      full_name: "Admin",
      email: "parul.rescue@gmail.com",
      username: "parul_rescue",
      mobile_number: "9664757932",
      password_hash: passwordHash,
      password_plain: passwordPlain,
      role: "admin",
      is_active: true,
    });

    return success("Admin and permissions seeded", { id: admin.id, email: admin.email, permissions_created: permCount }, 201);
  } catch (err: any) {
    return error(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to seed admin");
  }
}

export async function loginAdmin(req: FastifyRequest) {
  try {
    const { email, password } = req.body as { email: string; password: string };

    const admin = await AdminUser.findOne({ where: { email }, raw: true });
    if (!admin) {
      return error(HttpStatus.UNAUTHORIZED, "Invalid email or password");
    }

    if (!admin.is_active) {
      return error(HttpStatus.FORBIDDEN, "Account is deactivated");
    }

    const valid = await verifyPassword(password, admin.password_hash);
    if (!valid) {
      return error(HttpStatus.UNAUTHORIZED, "Invalid email or password");
    }

    const expiresAt = getExpiryDate();
    const session = await Session.create({
      user_id: admin.id,
      user_type: "admin",
      token_hash: "",
      device_info: req.headers["user-agent"] || null,
      ip_address: req.clientInfo?.ipv4 || req.clientInfo?.ip || null,
      is_active: true,
      expires_at: expiresAt,
    });

    const token = generateToken({
      adminId: admin.id,
      adminRole: admin.role,
      sessionId: session.id,
    });

    await session.update({ token_hash: hashToken(token) });

    // Fetch permissions for sub_admin
    let permissions: string[] = [];
    if (admin.role === "sub_admin") {
      const adminPerms = await AdminPermission.findAll({
        where: { admin_id: admin.id },
        include: [{ model: Permission, attributes: ["key"] }],
        raw: true,
        nest: true,
      });
      permissions = adminPerms.map((ap: any) => ap.permission?.key).filter(Boolean);
    }

    return success("Login successful", {
      admin_user: {
        id: admin.id,
        full_name: admin.full_name,
        username: admin.username,
        email: admin.email,
        role: admin.role,
        profile_pic: admin.profile_pic,
      },
      token,
      permissions,
      expiresAt,
    });
  } catch (err: any) {
    console.log(err, 'err')
    return error(HttpStatus.INTERNAL_SERVER_ERROR, "Login failed");
  }
}

export async function logoutAdmin(req: FastifyRequest) {
  try {
    const session = await Session.findByPk(req.sessionId!);
    if (!session) {
      return error(HttpStatus.NOT_FOUND, "Session not found");
    }

    await session.update({ is_active: false });
    return success("Logged out successfully");
  } catch (err: any) {
    return error(HttpStatus.INTERNAL_SERVER_ERROR, "Logout failed");
  }
}

export async function getAdminSessions(req: FastifyRequest) {
  try {
    const sessions = await Session.findAll({
      where: {
        user_id: req.adminId!,
        user_type: "admin",
        is_active: true,
        expires_at: { [Op.gt]: new Date() },
      },
      attributes: ["id", "device_info", "ip_address", "createdAt", "expires_at"],
      order: [["createdAt", "DESC"]],
      raw: true,
    });

    return success("Sessions fetched", sessions);
  } catch (err: any) {
    return error(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to fetch sessions");
  }
}

export async function revokeAdminSession(req: FastifyRequest) {
  try {
    const { id } = req.params as { id: number };
    const session = await Session.findOne({
      where: { id, user_id: req.adminId!, user_type: "admin" },
    });

    if (!session) {
      return error(HttpStatus.NOT_FOUND, "Session not found");
    }

    await session.update({ is_active: false });
    return success("Session revoked successfully");
  } catch (err: any) {
    return error(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to revoke session");
  }
}

export async function forgotAdminPassword(req: FastifyRequest) {
  try {
    const { email } = req.body as { email: string };
    const admin = await AdminUser.findOne({ where: { email }, raw: true });

    if (!admin) {
      return success("If the email exists, a reset link has been sent");
    }

    await PasswordResetToken.update(
      { used: true },
      { where: { user_id: admin.id, user_type: "admin", used: false } }
    );

    const { raw, hash } = generateResetToken();

    await PasswordResetToken.create({
      user_id: admin.id,
      user_type: "admin",
      token_hash: hash,
      expires_at: new Date(Date.now() + 5 * 60 * 1000),
      used: false,
    });

    const resetLink = `${config.cors.adminFrontendUrl}/reset-password?token=${raw}`;

    try {
      await sendPasswordResetEmail(admin.email, admin.full_name, resetLink);
    } catch (err) {
      console.error("Failed to send password reset email:", err);
    }

    return success("If the email exists, a reset link has been sent");
  } catch (err: any) {
    return error(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to process forgot password");
  }
}

export async function resetAdminPassword(req: FastifyRequest) {
  try {
    const { token, password } = req.body as { token: string; password: string };
    const tokenHash = hashResetToken(token);

    const resetToken = await PasswordResetToken.findOne({
      where: {
        token_hash: tokenHash,
        user_type: "admin",
        used: false,
        expires_at: { [Op.gt]: new Date() },
      },
    });

    if (!resetToken) {
      return error(HttpStatus.BAD_REQUEST, "Invalid or expired reset token");
    }

    const admin = await AdminUser.findByPk(resetToken.user_id);
    if (!admin) {
      return error(HttpStatus.NOT_FOUND, "Admin not found");
    }

    const hash = await hashPassword(password);
    const encryptedPlain = encryptAES(password);
    await admin.update({ password_hash: hash, password_plain: encryptedPlain });

    await resetToken.update({ used: true });

    await Session.update(
      { is_active: false },
      { where: { user_id: admin.id, user_type: "admin", is_active: true } }
    );

    return success("Password reset successfully");
  } catch (err: any) {
    return error(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to reset password");
  }
}

export async function changeAdminPassword(req: FastifyRequest) {
  try {
    const { oldPassword, newPassword } = req.body as { oldPassword: string; newPassword: string };

    const admin = await AdminUser.findByPk(req.adminId!);
    if (!admin) {
      return error(HttpStatus.NOT_FOUND, "Admin not found");
    }

    const valid = await verifyPassword(oldPassword, admin.password_hash);
    if (!valid) {
      return error(HttpStatus.BAD_REQUEST, "Current password is incorrect");
    }

    const hash = await hashPassword(newPassword);
    const encryptedPlain = encryptAES(newPassword);
    await admin.update({ password_hash: hash, password_plain: encryptedPlain });

    return success("Password changed successfully");
  } catch (err: any) {
    return error(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to change password");
  }
}
