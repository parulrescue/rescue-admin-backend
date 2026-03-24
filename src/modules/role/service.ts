import { FastifyRequest } from "fastify";
import { Permission } from "../../db/models/permission/permission.model";
import { Role } from "../../db/models/permission/role.model";
import { RolePermission } from "../../db/models/permission/role-permission.model";
import { AdminUser } from "../../db/models/auth/admin-user.model";
import { success, error } from "../../shared/http/response";
import { HttpStatus } from "../../shared/http/status";
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

export async function listRoles(req: FastifyRequest) {
  try {
    const roles = await Role.findAll({
      include: [
        {
          model: Permission,
          through: { attributes: [] },
          attributes: ["id", "key", "module", "description"],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    // Count assigned sub-admins per role
    const rolesData = await Promise.all(
      roles.map(async (role) => {
        const subAdminCount = await AdminUser.count({
          where: { role_id: role.id, role: "sub_admin" },
        });
        return {
          ...role.toJSON(),
          sub_admin_count: subAdminCount,
        };
      })
    );

    return success("Roles fetched", rolesData);
  } catch (err: any) {
    return error(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to fetch roles");
  }
}

export async function createRole(req: FastifyRequest) {
  try {
    const body = req.body as {
      name: string;
      description?: string | null;
      permission_ids: number[];
    };
    const transaction = await sequelize.transaction();

    try {
      const role = await Role.create(
        { name: body.name, description: body.description || null, created_by: req.adminId! },
        { transaction }
      );

      if (body.permission_ids.length > 0) {
        const records = body.permission_ids.map((pid) => ({
          role_id: role.id,
          permission_id: pid,
        }));
        await RolePermission.bulkCreate(records, { transaction });
      }

      await transaction.commit();
      return success("Role created successfully", { id: role.id }, 201);
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (err: any) {
    return error(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to create role");
  }
}

export async function updateRole(req: FastifyRequest) {
  try {
    const { id } = req.params as { id: number };
    const body = req.body as {
      name?: string;
      description?: string | null;
      permission_ids?: number[];
    };
    const role = await Role.findByPk(id);
    if (!role) return error(404, "Role not found");

    const transaction = await sequelize.transaction();

    try {
      if (body.name !== undefined) await role.update({ name: body.name }, { transaction });
      if (body.description !== undefined) await role.update({ description: body.description }, { transaction });

      if (body.permission_ids) {
        // Delete all existing role_permissions and re-insert
        await RolePermission.destroy({ where: { role_id: id }, transaction });
        if (body.permission_ids.length > 0) {
          const records = body.permission_ids.map((pid) => ({
            role_id: id,
            permission_id: pid,
          }));
          await RolePermission.bulkCreate(records, { transaction });
        }
      }

      await transaction.commit();
      return success("Role updated successfully");
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (err: any) {
    return error(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to update role");
  }
}

export async function deleteRole(req: FastifyRequest) {
  try {
    const { id } = req.params as { id: number };
    const role = await Role.findByPk(id);
    if (!role) return error(404, "Role not found");

    // Check if sub-admins still assigned
    const assignedCount = await AdminUser.count({ where: { role_id: id, role: "sub_admin" } });
    if (assignedCount > 0) {
      return error(400, `Cannot delete role: ${assignedCount} sub-admin(s) still assigned`);
    }

    await role.destroy(); // CASCADE deletes role_permissions
    return success("Role deleted successfully");
  } catch (err: any) {
    return error(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to delete role");
  }
}
