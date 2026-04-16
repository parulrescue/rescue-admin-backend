import { FastifyRequest } from "fastify";
import { Op } from "sequelize";
import { AdminUser } from "../../db/models/auth/admin-user.model";
import { Permission } from "../../db/models/permission/permission.model";
import { AdminPermission } from "../../db/models/permission/admin-permission.model";
import { hashPassword } from "../../shared/security/password";
import { encryptAES, decryptAES } from "../../shared/security/crypto";
import { sendWelcomeEmail, sendAccountUpdatedEmail } from "../../services/email.service";
import { success, error } from "../../shared/http/response";
import { HttpStatus } from "../../shared/http/status";
import { getPagination, getPaginationMeta } from "../../shared/utils/pagination";
import { config } from "../../config";
import { sequelize } from "../../db";

export async function listPermissions(req: FastifyRequest) {
  try {
    const permissions = await Permission.findAll({
      attributes: ["id", "key", "module", "description"],
      order: [["module", "ASC"], ["key", "ASC"]],
      raw: true,
    });
    return success("Permissions fetched", permissions);
  } catch (err: any) {
    return error(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to fetch permissions");
  }
}

export async function listSubAdmins(req: FastifyRequest) {
  try {
    const { page, limit, search } = req.query as { page: number; limit: number; search?: string };
    const { offset, limit: take } = getPagination({ page, limit });

    const where: any = { role: "sub_admin" };
    if (search) {
      where[Op.or] = [
        { full_name: { [Op.like]: `%${search}%` } },
        { username: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
      ];
    }

    const { count, rows } = await AdminUser.findAndCountAll({
      where,
      attributes: ["id", "full_name", "username", "mobile_number", "email", "profile_pic", "password_plain", "role", "is_active", "createdAt"],
      include: [
        {
          model: Permission,
          through: { attributes: [] },
          attributes: ["id", "key", "module"],
        },
      ],
      offset,
      limit: take,
      order: [["id", "DESC"]],
      distinct: true,
    });

    const data = rows.map((r) => {
      const json: any = r.toJSON();
      let plainPw: string | null = null;
      if (json.password_plain) {
        try { plainPw = decryptAES(json.password_plain); } catch {}
      }
      json.plain_password = plainPw;
      delete json.password_plain;
      return json;
    });

    return {
      ...success("Sub-admins fetched", data),
      pagination: getPaginationMeta(count, { page, limit }),
    };
  } catch (err: any) {
    return error(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to fetch sub-admins");
  }
}

export async function createSubAdmin(req: FastifyRequest) {
  try {
    const body = req.body as {
      full_name: string;
      mobile_number: string;
      username: string;
      email: string;
      password: string;
      permission_ids?: number[];
    };

    // Check for duplicate credentials
    const existing = await AdminUser.findOne({
      where: {
        [Op.or]: [
          { username: body.username },
          { email: body.email },
          { mobile_number: body.mobile_number },
        ],
      },
      attributes: ["username", "email", "mobile_number"],
      raw: true,
    });
    if (existing) {
      if (existing.username === body.username) return error(HttpStatus.BAD_REQUEST, "Username already exists, try with a new one");
      if (existing.email === body.email) return error(HttpStatus.BAD_REQUEST, "Email already exists, try with a new one");
      if (existing.mobile_number === body.mobile_number) return error(HttpStatus.BAD_REQUEST, "Mobile number already exists, try with a new one");
    }

    const transaction = await sequelize.transaction();

    try {
      const passwordHash = await hashPassword(body.password);
      const encryptedPlain = encryptAES(body.password);

      const admin = await AdminUser.create(
        {
          full_name: body.full_name,
          mobile_number: body.mobile_number,
          username: body.username,
          email: body.email,
          password_hash: passwordHash,
          password_plain: encryptedPlain,
          role: "sub_admin",
          is_active: true,
        },
        { transaction }
      );

      if (body.permission_ids && body.permission_ids.length > 0) {
        const records = body.permission_ids.map((pid) => ({
          admin_id: admin.id,
          permission_id: pid,
        }));
        await AdminPermission.bulkCreate(records, { transaction });
      }

      await transaction.commit();

      try {
         sendWelcomeEmail(
          body.email,
          body.full_name,
          body.username,
          body.password,
          `${config.cors.adminFrontendUrl}/login`,
          "sub_admin"
        );
      } catch (emailErr) {
        console.error("Failed to send welcome email:", emailErr);
      }

      return success("Sub-admin created successfully", { id: admin.id }, 201);
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (err: any) {
    return error(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to create sub-admin");
  }
}

export async function updateSubAdmin(req: FastifyRequest) {
  try {
    const { id } = req.params as { id: number };
    const body = req.body as {
      full_name?: string;
      mobile_number?: string;
      username?: string;
      email?: string;
      password?: string;
      permission_ids?: number[];
    };

    const adminRaw = await AdminUser.findOne({ where: { id, role: "sub_admin" }, raw: true });
    if (!adminRaw) return error(404, "Sub-admin not found");

    // Check for duplicate credentials (exclude current admin)
    const dupeChecks: any[] = [];
    if (body.username) dupeChecks.push({ username: body.username });
    if (body.mobile_number) dupeChecks.push({ mobile_number: body.mobile_number });
    if (dupeChecks.length > 0) {
      const existing = await AdminUser.findOne({
        where: { [Op.or]: dupeChecks, id: { [Op.ne]: id } },
        attributes: ["username", "mobile_number"],
        raw: true,
      });
      if (existing) {
        if (body.username && existing.username === body.username) return error(HttpStatus.BAD_REQUEST, "Username already exists, try with a new one");
        if (body.mobile_number && existing.mobile_number === body.mobile_number) return error(HttpStatus.BAD_REQUEST, "Mobile number already exists, try with a new one");
      }
    }

    const transaction = await sequelize.transaction();

    try {
      const updateData: any = {};
      const changes: string[] = [];
      if (body.full_name) updateData.full_name = body.full_name;
      if (body.mobile_number) updateData.mobile_number = body.mobile_number;
      if (body.username) updateData.username = body.username;
      if (body.password) {
        updateData.password_hash = await hashPassword(body.password);
        updateData.password_plain = encryptAES(body.password);
      }

      // Detect what actually changed
      if (body.full_name && body.full_name !== adminRaw.full_name) changes.push("Full name updated");
      if (body.mobile_number && body.mobile_number !== adminRaw.mobile_number) changes.push("Mobile number updated");
      if (body.username && body.username !== adminRaw.username) changes.push(`Username changed to ${body.username}`);
      if (body.password) changes.push("Password changed");

      if (Object.keys(updateData).length > 0) {
        await AdminUser.update(updateData, { where: { id }, transaction });
      }

      if (body.permission_ids !== undefined) {
        await AdminPermission.destroy({ where: { admin_id: id }, transaction });
        if (body.permission_ids.length > 0) {
          const records = body.permission_ids.map((pid) => ({
            admin_id: id,
            permission_id: pid,
          }));
          await AdminPermission.bulkCreate(records, { transaction });
        }
      }

      await transaction.commit();

      // Send email notification
      if (changes.length > 0) {
        try {
          console.log("Sending account updated email to:", adminRaw.email, "changes:", changes);
          await sendAccountUpdatedEmail(
            adminRaw.email,
            updateData.full_name || adminRaw.full_name,
            changes,
            body.password,
            `${config.cors.adminFrontendUrl}/login`
          );
          console.log("Account updated email sent successfully");
        } catch (emailErr) {
          console.error("Failed to send account updated email:", emailErr);
        }
      }

      return success("Sub-admin updated", { id: adminRaw.id });
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (err: any) {
    return error(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to update sub-admin");
  }
}

export async function toggleSubAdminStatus(req: FastifyRequest) {
  try {
    const { id } = req.params as { id: number };
    const admin = await AdminUser.findOne({ where: { id, role: "sub_admin" }, raw: true });
    if (!admin) return error(404, "Sub-admin not found");

    await AdminUser.update({ is_active: !admin.is_active }, { where: { id } });
    const action = admin.is_active ? "activated" : "deactivated";
    return success(`Sub-admin ${action}`);
  } catch (err: any) {
    return error(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to toggle sub-admin status");
  }
}

export async function deleteSubAdmin(req: FastifyRequest) {
  try {
    const { id } = req.params as { id: number };
    const admin = await AdminUser.findOne({ where: { id, role: "sub_admin" } });
    if (!admin) return error(404, "Sub-admin not found");

    const transaction = await sequelize.transaction();
    try {
      await AdminPermission.destroy({ where: { admin_id: id }, transaction });
      await admin.destroy({ transaction });
      await transaction.commit();
      return success("Sub-admin deleted permanently");
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (err: any) {
    return error(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to delete sub-admin");
  }
}
