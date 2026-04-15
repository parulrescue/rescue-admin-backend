import { FastifyRequest } from "fastify";
import { Op } from "sequelize";
import { Ledger } from "../../db/models/ledger/ledger.model";
import { AdminUser } from "../../db/models/auth/admin-user.model";
import { success, error } from "../../shared/http/response";
import { HttpStatus } from "../../shared/http/status";
import { getPagination, getPaginationMeta } from "../../shared/utils/pagination";
import { sequelize } from "../../db";
import { uploadMultipleFiles, UploadError, deleteFile } from "../../middleware/fileUpload";
import { config } from "../../config";

function isMultipart(req: FastifyRequest): boolean {
  const ct = req.headers["content-type"] || "";
  return ct.toString().toLowerCase().includes("multipart/form-data");
}

function parseLedgerFields(fields: Record<string, string>) {
  const type = (fields.type || "").toLowerCase();
  if (type !== "credit" && type !== "debit") {
    throw new UploadError("Type must be 'credit' or 'debit'", 400);
  }
  //@ts-ignore
  const amount = parseFloat(fields.amount);
  if (!isFinite(amount) || amount <= 0) {
    throw new UploadError("Amount must be a positive number", 400);
  }
  return {
    type: type as "credit" | "debit",
    amount,
    category: fields.category ? fields.category.slice(0, 100) : null,
    description: fields.description || null,
    reference_id: fields.reference_id ? fields.reference_id.slice(0, 100) : null,
  };
}

export async function listLedgerEntries(req: FastifyRequest) {
  try {
    const { page, limit, type, search, category, date_from, date_to } = req.query as any;
    const { offset, limit: take } = getPagination({ page, limit });

    const where: any = {};
    if (type) where.type = type;
    if (search) {
      where[Op.or] = [
        { description: { [Op.iLike]: `%${search}%` } },
        { category: { [Op.iLike]: `%${search}%` } },
        { reference_id: { [Op.iLike]: `%${search}%` } },
      ];
    }
    if (category) where.category = { [Op.iLike]: `%${category}%` };
    if (date_from || date_to) {
      where.createdAt = {};
      if (date_from) where.createdAt[Op.gte] = new Date(date_from);
      if (date_to) where.createdAt[Op.lte] = new Date(date_to + "T23:59:59.999Z");
    }

    const { count, rows } = await Ledger.findAndCountAll({
      where,
      include: [{ model: AdminUser, as: "creator", attributes: ["id", "full_name"] }],
      offset,
      limit: take,
      order: [["id", "DESC"]],
      raw: true,
      nest: true,
    });

    return {
      ...success("Ledger entries fetched", rows),
      pagination: getPaginationMeta(count, { page, limit }),
    };
  } catch (err: any) {
    return error(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to fetch ledger entries");
  }
}

export async function getLedgerSummary(req: FastifyRequest) {
  try {
    const [result] = await sequelize.query(`
      SELECT
        COALESCE(SUM(CASE WHEN type = 'credit' THEN amount ELSE 0 END), 0) as total_credit,
        COALESCE(SUM(CASE WHEN type = 'debit' THEN amount ELSE 0 END), 0) as total_debit,
        COALESCE(SUM(CASE WHEN type = 'credit' THEN amount ELSE -amount END), 0) as net_balance
      FROM ledger
    `) as [any[], unknown];

    const summary = result[0] || { total_credit: 0, total_debit: 0, net_balance: 0 };

    return success("Ledger summary fetched", {
      total_credit: parseFloat(summary.total_credit),
      total_debit: parseFloat(summary.total_debit),
      net_balance: parseFloat(summary.net_balance),
    });
  } catch (err: any) {
    return error(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to fetch ledger summary");
  }
}

async function getCurrentBalance(): Promise<number> {
  const [result] = await sequelize.query(`
    SELECT COALESCE(SUM(CASE WHEN type = 'credit' THEN amount ELSE -amount END), 0) as balance
    FROM ledger
  `) as [any[], unknown];
  return parseFloat(result[0]?.balance || 0);
}

export async function createLedgerEntry(req: FastifyRequest) {
  try {
    let body: ReturnType<typeof parseLedgerFields>;
    let photoUrl: string | null = null;

    if (isMultipart(req)) {
      const { files, fields } = await uploadMultipleFiles(req, {
        subDir: "ledger",
        prefix: "ledger",
        allowedMimes: ["image/jpeg", "image/png", "image/webp"],
        maxSize: 5 * 1024 * 1024,
        maxFiles: 1,
      });
      body = parseLedgerFields(fields);
      if (files.length > 0 && files[0]) photoUrl = files[0].url;
    } else {
      const raw = req.body as any;
      body = parseLedgerFields({
        type: String(raw.type ?? ""),
        amount: String(raw.amount ?? ""),
        category: raw.category ?? "",
        description: raw.description ?? "",
        reference_id: raw.reference_id ?? "",
      });
    }

    if (body.type === "debit") {
      const balance = await getCurrentBalance();
      if (body.amount > balance) {
        return error(HttpStatus.BAD_REQUEST, `Insufficient balance. Current balance is ${balance}, cannot debit ${body.amount}`);
      }
    }

    console.log(photoUrl, 'photoUrl')

    const entry = await Ledger.create({
      type: body.type,
      amount: body.amount,
      category: body.category,
      description: body.description,
      reference_id: body.reference_id,
      photo_url: `${config.upload.fileAccessUrl}${photoUrl}`,
      created_by: req.adminId!,
    });

    return success("Ledger entry created", { id: entry.id }, 201);
  } catch (err: any) {
    if (err instanceof UploadError) return error(err.statusCode, err.message);
    return error(HttpStatus.INTERNAL_SERVER_ERROR, err?.message || "Failed to create ledger entry");
  }
}

export async function updateLedgerEntry(req: FastifyRequest) {
  try {
    const { id } = req.params as { id: number };
    const entry = await Ledger.findByPk(id);
    if (!entry) return error(404, "Ledger entry not found");

    let body: ReturnType<typeof parseLedgerFields>;
    let newPhotoUrl: string | null | undefined = undefined;
    let removePhoto = false;

    if (isMultipart(req)) {
      const { files, fields } = await uploadMultipleFiles(req, {
        subDir: "ledger",
        prefix: "ledger",
        allowedMimes: ["image/jpeg", "image/png", "image/webp"],
        maxSize: 5 * 1024 * 1024,
        maxFiles: 1,
      });
      body = parseLedgerFields(fields);
      if (files.length > 0 && files[0]) newPhotoUrl = files[0].url;
      else if (fields.remove_photo === "true") removePhoto = true;
    } else {
      const raw = req.body as any;
      body = parseLedgerFields({
        type: String(raw.type ?? ""),
        amount: String(raw.amount ?? ""),
        category: raw.category ?? "",
        description: raw.description ?? "",
        reference_id: raw.reference_id ?? "",
      });
    }

    if (body.type === "debit") {
      const balance = await getCurrentBalance();
      const oldEffect = entry.type === "credit" ? -entry.amount : entry.amount;
      const balanceWithoutEntry = balance + oldEffect;
      if (body.amount > balanceWithoutEntry) {
        return error(HttpStatus.BAD_REQUEST, `Insufficient balance. Available balance is ${balanceWithoutEntry}, cannot debit ${body.amount}`);
      }
    }

    const updateData: any = {
      type: body.type,
      amount: body.amount,
      category: body.category,
      description: body.description,
      reference_id: body.reference_id,
    };
    if (newPhotoUrl !== undefined) {
      if (entry.photo_url) deleteFile(entry.photo_url);
      updateData.photo_url = newPhotoUrl;
    } else if (removePhoto) {
      if (entry.photo_url) deleteFile(entry.photo_url);
      updateData.photo_url = null;
    }

    await entry.update(updateData);
    return success("Ledger entry updated");
  } catch (err: any) {
    if (err instanceof UploadError) return error(err.statusCode, err.message);
    return error(HttpStatus.INTERNAL_SERVER_ERROR, err?.message || "Failed to update ledger entry");
  }
}

export async function deleteLedgerEntry(req: FastifyRequest) {
  try {
    const { id } = req.params as { id: number };
    const entry = await Ledger.findByPk(id);
    if (!entry) return error(404, "Ledger entry not found");

    if (entry.photo_url) deleteFile(entry.photo_url);
    await entry.destroy();
    return success("Ledger entry deleted");
  } catch (err: any) {
    return error(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to delete ledger entry");
  }
}
