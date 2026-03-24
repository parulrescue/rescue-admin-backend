import { FastifyRequest } from "fastify";
import { Op } from "sequelize";
import { User } from "../../db/models/auth/user.model";
import { hashPassword } from "../../shared/security/password";
import { encryptAES, decryptAES } from "../../shared/security/crypto";
import { sendWelcomeEmail, sendAccountUpdatedEmail } from "../../services/email.service";
import { success, error } from "../../shared/http/response";
import { HttpStatus } from "../../shared/http/status";
import { getPagination, getPaginationMeta } from "../../shared/utils/pagination";
import { config } from "../../config";

function safeDecrypt(encrypted: string | null): string | null {
  if (!encrypted) return null;
  try {
    return decryptAES(encrypted);
  } catch {
    return null;
  }
}

export async function listUsers(req: FastifyRequest) {
  try {
    const { page, limit, search } = req.query as { page: number; limit: number; search?: string };
    const { offset, limit: take } = getPagination({ page, limit });

    const where: any = {};
    if (search) {
      where[Op.or] = [
        { full_name: { [Op.iLike]: `%${search}%` } },
        { username: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
        { mobile_number: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const { count, rows } = await User.findAndCountAll({
      where,
      attributes: ["id", "full_name", "username", "mobile_number", "email", "profile_pic", "password_plain", "is_active", "createdAt"],
      offset,
      limit: take,
      order: [["id", "DESC"]],
      raw: true,
    });

    const data = rows.map((u: any) => ({
      ...u,
      plain_password: safeDecrypt(u.password_plain),
      password_plain: undefined,
    }));

    return {
      ...success("Users fetched", data),
      pagination: getPaginationMeta(count, { page, limit }),
    };
  } catch (err: any) {
    return error(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to fetch users");
  }
}

export async function getUser(req: FastifyRequest) {
  try {
    const { id } = req.params as { id: number };
    const user = await User.findByPk(id, {
      attributes: { exclude: ["password_hash"] },
      raw: true,
    });
    if (!user) return error(404, "User not found");

    const data: any = { ...user };
    data.plain_password = safeDecrypt(data.password_plain);
    delete data.password_plain;

    return success("User fetched", data);
  } catch (err: any) {
    return error(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to fetch user");
  }
}

export async function createUser(req: FastifyRequest) {
  try {
    const body = req.body as {
      full_name: string;
      mobile_number: string;
      username: string;
      email: string;
      password: string;
    };

    // Check for duplicate credentials
    const existing = await User.findOne({
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

    const passwordHash = await hashPassword(body.password);
    const encryptedPlain = encryptAES(body.password);
    const user = await User.create({
      full_name: body.full_name,
      mobile_number: body.mobile_number,
      username: body.username,
      email: body.email,
      password_hash: passwordHash,
      password_plain: encryptedPlain,
      is_active: true,
    });

    // Send welcome email
    try {
      await sendWelcomeEmail(
        body.email,
        body.full_name,
        body.username,
        body.password,
        `${config.cors.frontendUrl}/login`
      );
    } catch (emailErr) {
      console.error("Failed to send welcome email:", emailErr);
    }

    return success("User created successfully", { id: user.id }, 201);
  } catch (err: any) {
    console.log(err);
    return error(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to create user");
  }
}

export async function updateUser(req: FastifyRequest) {
  try {
    const { id } = req.params as { id: number };
    const body = req.body as {
      full_name?: string;
      mobile_number?: string;
      username?: string;
      email?: string;
      password?: string;
    };
    const user = await User.findByPk(id, { raw: true });
    if (!user) return error(404, "User not found");

    // Check for duplicate credentials (exclude current user)
    const dupeChecks: any[] = [];
    if (body.username) dupeChecks.push({ username: body.username });
    if (body.mobile_number) dupeChecks.push({ mobile_number: body.mobile_number });
    if (dupeChecks.length > 0) {
      const existing = await User.findOne({
        where: { [Op.or]: dupeChecks, id: { [Op.ne]: id } },
        attributes: ["username", "mobile_number"],
        raw: true,
      });
      if (existing) {
        if (body.username && existing.username === body.username) return error(HttpStatus.BAD_REQUEST, "Username already exists, try with a new one");
        if (body.mobile_number && existing.mobile_number === body.mobile_number) return error(HttpStatus.BAD_REQUEST, "Mobile number already exists, try with a new one");
      }
    }

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
    if (body.full_name && body.full_name !== user.full_name) changes.push("Full name updated");
    if (body.mobile_number && body.mobile_number !== user.mobile_number) changes.push("Mobile number updated");
    if (body.username && body.username !== user.username) changes.push(`Username changed to ${body.username}`);
    if (body.password) changes.push("Password changed");

    await User.update(updateData, { where: { id } });

    // Send email notification
    if (changes.length > 0) {
      try {
        console.log("Sending account updated email to:", user.email, "changes:", changes);
        await sendAccountUpdatedEmail(
          user.email,
          updateData.full_name || user.full_name,
          changes,
          body.password,
          `${config.cors.frontendUrl}/login`
        );
        console.log("Account updated email sent successfully");
      } catch (emailErr) {
        console.error("Failed to send account updated email:", emailErr);
      }
    } else {
      console.log("No changes detected, skipping email");
    }

    return success("User updated", { id: user.id });
  } catch (err: any) {
    console.log(err);
    return error(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to update user");
  }
}

export async function toggleUserStatus(req: FastifyRequest) {
  try {
    const { id } = req.params as { id: string };
    const user = await User.findByPk(id, { raw: true });
    if (!user) return error(404, "User not found");

    await User.update({ is_active: !user.is_active }, { where: { id } });
    const action = user.is_active ? "activated" : "deactivated";
    return success(`User ${action}`);
  } catch (err: any) {
    return error(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to toggle user status");
  }
}

export async function deleteUser(req: FastifyRequest) {
  try {
    const { id } = req.params as { id: number };
    const user = await User.findByPk(id);
    if (!user) return error(404, "User not found");

    const { sequelize: seq } = User;
    const transaction = await seq!.transaction();
    try {
      // Nullify user references on rescue data (preserve rescues)
      await seq!.query(`UPDATE "rescue_persons" SET "user_id" = NULL WHERE "user_id" = :id`, { replacements: { id }, transaction });
      await seq!.query(`UPDATE "rescues" SET "info_provider_user_id" = NULL WHERE "info_provider_user_id" = :id`, { replacements: { id }, transaction });
      await seq!.query(`UPDATE "rescues" SET "created_by" = NULL WHERE "created_by" = :id`, { replacements: { id }, transaction });
      // Delete auth-related records
      await seq!.query(`DELETE FROM "sessions" WHERE "user_id" = :id AND "user_type" = 'user'`, { replacements: { id }, transaction });
      await seq!.query(`DELETE FROM "password_reset_tokens" WHERE "user_id" = :id AND "user_type" = 'user'`, { replacements: { id }, transaction });
      await user.destroy({ transaction });
      await transaction.commit();
      return success("User deleted. Rescue data preserved.");
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (err: any) {
    return error(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to delete user");
  }
}
