import { FastifyRequest } from "fastify";
import { Op } from "sequelize";
import { Animal } from "../../db/models/rescue/animal.model";
import { success, error } from "../../shared/http/response";
import { HttpStatus } from "../../shared/http/status";
import { getPagination, getPaginationMeta } from "../../shared/utils/pagination";

export async function listAnimals(req: FastifyRequest) {
  try {
    const { search, page, limit } = req.query as { search?: string; page?: number; limit?: number };
    const where: any = {};
    if (search) {
      where.name = { [Op.iLike]: `%${search}%` };
    }

    if (page && limit) {
      const { offset, limit: take } = getPagination({ page, limit });
      const { count, rows } = await Animal.findAndCountAll({
        where,
        order: [["id", "DESC"]],
        attributes: ["id", "name", "is_active"],
        offset,
        limit: take,
      });
      return {
        ...success("Animals fetched", rows),
        pagination: getPaginationMeta(count, { page, limit }),
      };
    }

    const animals = await Animal.findAll({
      where,
      order: [["name", "ASC"]],
      attributes: ["id", "name", "is_active"],
    });

    return success("Animals fetched", animals);
  } catch (err: any) {
    return error(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to fetch animals");
  }
}

export async function createAnimal(req: FastifyRequest) {
  try {
    const { name } = req.body as { name: string };

    const existing = await Animal.findOne({ where: { name: { [Op.iLike]: name } } });
    if (existing) return error(HttpStatus.CONFLICT, "Animal with this name already exists");

    const animal = await Animal.create({ name, is_active: true });
    return success("Animal created", animal, HttpStatus.CREATED);
  } catch (err: any) {
    return error(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to create animal");
  }
}

export async function updateAnimal(req: FastifyRequest) {
  try {
    const { id } = req.params as { id: number };
    const { name, is_active } = req.body as { name?: string; is_active?: boolean };

    const animal = await Animal.findByPk(id);
    if (!animal) return error(HttpStatus.NOT_FOUND, "Animal not found");

    if (name && name?.toLowerCase() !== animal?.name?.toLowerCase()) {
      const dup = await Animal.findOne({ where: { name: { [Op.iLike]: name }, id: { [Op.ne]: id } } });
      if (dup) return error(HttpStatus.CONFLICT, "Animal with this name already exists");
    }

    await animal.update({
      ...(name !== undefined && { name }),
      ...(is_active !== undefined && { is_active }),
    });

    return success("Animal updated", animal);
  } catch (err: any) {
    console.log(err)
    return error(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to update animal");
  }
}

export async function deleteAnimal(req: FastifyRequest) {
  try {
    const { id } = req.params as { id: number };
    const animal = await Animal.findByPk(id);
    if (!animal) return error(HttpStatus.NOT_FOUND, "Animal not found");

    await animal.destroy();
    return success("Animal deleted");
  } catch (err: any) {
    return error(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to delete animal");
  }
}
