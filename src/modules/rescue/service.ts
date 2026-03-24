import { FastifyRequest } from "fastify";
import { Op } from "sequelize";
import { Rescue } from "../../db/models/rescue/rescue.model";
import { RescueImage } from "../../db/models/rescue/rescue-image.model";
import { RescuePerson } from "../../db/models/rescue/rescue-person.model";
import { User } from "../../db/models/auth/user.model";
import { success, error } from "../../shared/http/response";
import { HttpStatus } from "../../shared/http/status";
import { getPagination, getPaginationMeta } from "../../shared/utils/pagination";
import { sequelize } from "../../db";
import { uploadMultipleFiles, UploadError, deleteFile } from "../../middleware/fileUpload";

export async function listRescues(req: FastifyRequest) {
  try {
    const { page, limit, status, animal_type, search, date_from, date_to } = req.query as any;
    const { offset, limit: take } = getPagination({ page, limit });

    const where: any = {};
    if (status) where.status = status;
    if (animal_type) where.animal_type = { [Op.iLike]: `%${animal_type}%` };
    if (search) {
      where[Op.or] = [
        { animal_type: { [Op.iLike]: `%${search}%` } },
        { info_provider_name: { [Op.iLike]: `%${search}%` } },
        { from_address: { [Op.iLike]: `%${search}%` } },
        { to_address: { [Op.iLike]: `%${search}%` } },
      ];
    }
    if (date_from || date_to) {
      where.createdAt = {};
      if (date_from) where.createdAt[Op.gte] = new Date(date_from);
      if (date_to) where.createdAt[Op.lte] = new Date(date_to + "T23:59:59.999Z");
    }

    const { count, rows } = await Rescue.findAndCountAll({
      where,
      include: [
        { model: RescueImage, as: "images", attributes: ["id", "image_url", "media_type"], separate: true, order: [["sort_order", "ASC"]], limit: 1 },
        { model: RescuePerson, as: "rescue_persons", attributes: ["user_id"] },
        { model: User, as: "creator", attributes: ["id", "full_name"] },
      ],
      attributes: ["id", "animal_type", "animal_description", "status", "info_provider_name", "info_provider_number", "from_address", "from_pincode", "from_area", "to_address", "to_pincode", "to_area", "createdAt"],
      offset,
      limit: take,
      order: [["id", "DESC"]],
      distinct: true,
      raw: true,
      nest: true,
    });

    return {
      ...success("Rescues fetched", rows),
      pagination: getPaginationMeta(count, { page, limit }),
    };
  } catch (err: any) {
    return error(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to fetch rescues");
  }
}

export async function getRescue(req: FastifyRequest) {
  try {
    const { id } = req.params as { id: number };
    const rescue = await Rescue.findByPk(id, {
      include: [
        { model: RescueImage, as: "images", attributes: ["id", "image_url", "media_type", "sort_order"], separate: true, order: [["sort_order", "ASC"]] },
        {
          model: RescuePerson, as: "rescue_persons", attributes: ["id", "user_id"], separate: true,
          include: [{ model: User, attributes: ["id", "full_name", "mobile_number", "profile_pic"] }],
        },
        { model: User, as: "creator", attributes: ["id", "full_name", "username"] },
      ],
    });

    if (!rescue) return error(404, "Rescue not found");
    return success("Rescue fetched", rescue.toJSON());
  } catch (err: any) {
    return error(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to fetch rescue");
  }
}

export async function updateRescueFull(req: FastifyRequest) {
  try {
    const { id } = req.params as { id: number };

    const { files: uploadedFiles, fields } = await uploadMultipleFiles(req, {
      subDir: "rescues",
      prefix: "rescue",
      allowedMimes: ["image/jpeg", "image/png", "image/webp", "video/mp4", "video/quicktime", "video/x-msvideo", "video/webm"],
      maxSize: 100 * 1024 * 1024,
      maxFiles: 10,
    });

    const rescue = await Rescue.findByPk(id);
    if (!rescue) return error(404, "Rescue not found");

    const transaction = await sequelize.transaction();
    try {
      // Update rescue fields
      const updateData: any = {};
      if (fields.animal_type) updateData.animal_type = fields.animal_type;
      if (fields.animal_description !== undefined) updateData.animal_description = fields.animal_description || null;
      if (fields.info_provider_name) updateData.info_provider_name = fields.info_provider_name;
      if (fields.info_provider_number) updateData.info_provider_number = fields.info_provider_number;
      if (fields.from_address) updateData.from_address = fields.from_address;
      if (fields.from_pincode !== undefined) updateData.from_pincode = fields.from_pincode || null;
      if (fields.from_area !== undefined) updateData.from_area = fields.from_area || null;
      if (fields.to_address) updateData.to_address = fields.to_address;
      if (fields.to_pincode !== undefined) updateData.to_pincode = fields.to_pincode || null;
      if (fields.to_area !== undefined) updateData.to_area = fields.to_area || null;
      if (fields.status) updateData.status = fields.status;

      if (Object.keys(updateData).length > 0) {
        await rescue.update(updateData, { transaction });
      }

      // Handle removed media: delete_media_ids is a JSON array of image IDs to remove
      if (fields.delete_media_ids) {
        try {
          const deleteIds: number[] = JSON.parse(fields.delete_media_ids);
          if (deleteIds.length > 0) {
            const toDelete = await RescueImage.findAll({ where: { id: deleteIds, rescue_id: id } });
            for (const img of toDelete) {
              deleteFile(img.image_url);
            }
            await RescueImage.destroy({ where: { id: deleteIds, rescue_id: id }, transaction });
          }
        } catch {}
      }

      // Add new uploaded files
      if (uploadedFiles.length > 0) {
        const existingCount = await RescueImage.count({ where: { rescue_id: id }, transaction });
        const newRecords = uploadedFiles.map((file, index) => ({
          rescue_id: id,
          image_url: file.url,
          media_type: file.mimetype.startsWith("video/") ? "video" : "image",
          sort_order: existingCount + index,
        }));
        await RescueImage.bulkCreate(newRecords, { transaction });
      }

      // Update rescue persons
      if (fields.rescue_person_ids) {
        try {
          const personIds: number[] = JSON.parse(fields.rescue_person_ids);
          await RescuePerson.destroy({ where: { rescue_id: id }, transaction });
          if (personIds.length > 0) {
            const personRecords = personIds.map((userId) => ({
              rescue_id: id,
              user_id: userId,
            }));
            await RescuePerson.bulkCreate(personRecords, { transaction });
          }
        } catch {}
      }

      await transaction.commit();
      return success("Rescue updated", { id: rescue.id });
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (err: any) {
    if (err instanceof UploadError) {
      return error(err.statusCode, err.message);
    }
    return error(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to update rescue");
  }
}

export async function updateRescue(req: FastifyRequest) {
  try {
    const { id } = req.params as { id: number };
    const body = req.body as {
      status?: string;
      animal_description?: string;
    };
    const rescue = await Rescue.findByPk(id);
    if (!rescue) return error(404, "Rescue not found");

    await rescue.update(body);
    return success("Rescue updated", { id: rescue.id });
  } catch (err: any) {
    return error(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to update rescue");
  }
}

export async function updateRescueStatus(req: FastifyRequest) {
  try {
    const { id } = req.params as { id: number };
    const { status } = req.body as { status: string };
    const rescue = await Rescue.findByPk(id);
    if (!rescue) return error(404, "Rescue not found");

    await rescue.update({ status });
    return success("Status updated", { id: rescue.id, status });
  } catch (err: any) {
    return error(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to update status");
  }
}

export async function deleteRescue(req: FastifyRequest) {
  try {
    const { id } = req.params as { id: number };
    const rescue = await Rescue.findByPk(id);
    if (!rescue) return error(404, "Rescue not found");

    // Delete media files from disk
    const images = await RescueImage.findAll({ where: { rescue_id: id } });
    for (const img of images) {
      deleteFile(img.image_url);
    }

    await rescue.destroy(); // CASCADE deletes images and persons
    return success("Rescue deleted successfully");
  } catch (err: any) {
    return error(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to delete rescue");
  }
}
