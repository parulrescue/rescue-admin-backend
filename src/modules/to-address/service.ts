import { FastifyRequest } from "fastify";
import { Op } from "sequelize";
import { ToAddress } from "../../db/models/rescue/to-address.model";
import { success, error } from "../../shared/http/response";
import { HttpStatus } from "../../shared/http/status";
import { getPagination, getPaginationMeta } from "../../shared/utils/pagination";

export async function listToAddresses(req: FastifyRequest) {
  try {
    const { page, limit, search } = req.query as { page: number; limit: number; search?: string };
    const { offset, limit: take } = getPagination({ page, limit });

    const where: any = {};
    if (search) {
      where[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { address: { [Op.iLike]: `%${search}%` } },
        { area: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const { count, rows } = await ToAddress.findAndCountAll({
      where,
      offset,
      limit: take,
      order: [["id", "DESC"]],
    });

    return {
      ...success("To addresses fetched", rows),
      pagination: getPaginationMeta(count, { page, limit }),
    };
  } catch (err: any) {
    return error(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to fetch to addresses");
  }
}

export async function getToAddress(req: FastifyRequest) {
  try {
    const { id } = req.params as { id: number };
    const addr = await ToAddress.findByPk(id);
    if (!addr) return error(404, "To address not found");
    return success("To address fetched", addr);
  } catch (err: any) {
    return error(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to fetch to address");
  }
}

export async function createToAddress(req: FastifyRequest) {
  try {
    const body = req.body as { title: string; address: string; pincode?: string; area?: string };
    const addr = await ToAddress.create({
      title: body.title,
      address: body.address,
      pincode: body.pincode || null,
      area: body.area || null,
      is_active: true,
    });
    return success("To address created", { id: addr.id }, 201);
  } catch (err: any) {
    return error(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to create to address");
  }
}

export async function updateToAddress(req: FastifyRequest) {
  try {
    const { id } = req.params as { id: number };
    const body = req.body as { title?: string; address?: string; pincode?: string; area?: string };
    const addr = await ToAddress.findByPk(id);
    if (!addr) return error(404, "To address not found");

    const updateData: any = {};
    if (body.title) updateData.title = body.title;
    if (body.address) updateData.address = body.address;
    if (body.pincode !== undefined) updateData.pincode = body.pincode || null;
    if (body.area !== undefined) updateData.area = body.area || null;

    await addr.update(updateData);
    return success("To address updated", { id: addr.id });
  } catch (err: any) {
    return error(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to update to address");
  }
}

export async function toggleToAddressStatus(req: FastifyRequest) {
  try {
    const { id } = req.params as { id: number };
    const addr = await ToAddress.findByPk(id, { raw: true });
    if (!addr) return error(404, "To address not found");

    await ToAddress.update({ is_active: !addr.is_active }, { where: { id } });
    const action = addr.is_active ? "activated" : "deactivated";
    return success(`To address ${action}`);
  } catch (err: any) {
    return error(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to toggle to address status");
  }
}

export async function deleteToAddress(req: FastifyRequest) {
  try {
    const { id } = req.params as { id: number };
    const addr = await ToAddress.findByPk(id);
    if (!addr) return error(404, "To address not found");

    await addr.destroy();
    return success("To address deleted");
  } catch (err: any) {
    return error(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to delete to address");
  }
}
