import { FastifyRequest } from "fastify";
import { Op } from "sequelize";
import { Ledger } from "../../db/models/ledger/ledger.model";
import { AdminUser } from "../../db/models/auth/admin-user.model";
import { success, error } from "../../shared/http/response";
import { HttpStatus } from "../../shared/http/status";
import { getPagination, getPaginationMeta } from "../../shared/utils/pagination";
import { sequelize } from "../../db";

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
    const body = req.body as {
      type: "credit" | "debit";
      amount: number;
      category?: string | null;
      description?: string | null;
      reference_id?: string | null;
    };

    if (body.type === "debit") {
      const balance = await getCurrentBalance();
      if (body.amount > balance) {
        return error(HttpStatus.BAD_REQUEST, `Insufficient balance. Current balance is ${balance}, cannot debit ${body.amount}`);
      }
    }

    const entry = await Ledger.create({
      type: body.type,
      amount: body.amount,
      category: body.category || null,
      description: body.description || null,
      reference_id: body.reference_id || null,
      created_by: req.adminId!,
    });

    return success("Ledger entry created", { id: entry.id }, 201);
  } catch (err: any) {
    return error(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to create ledger entry");
  }
}

export async function updateLedgerEntry(req: FastifyRequest) {
  try {
    const { id } = req.params as { id: number };
    const body = req.body as {
      type?: "credit" | "debit";
      amount?: number;
      category?: string | null;
      description?: string | null;
      reference_id?: string | null;
    };
    const entry = await Ledger.findByPk(id);
    if (!entry) return error(404, "Ledger entry not found");

    const newType = body.type || entry.type;
    const newAmount = body.amount !== undefined ? body.amount : entry.amount;

    if (newType === "debit") {
      const balance = await getCurrentBalance();
      // Add back the old entry's effect to get balance without this entry
      const oldEffect = entry.type === "credit" ? -entry.amount : entry.amount;
      const balanceWithoutEntry = balance + oldEffect;
      if (newAmount > balanceWithoutEntry) {
        return error(HttpStatus.BAD_REQUEST, `Insufficient balance. Available balance is ${balanceWithoutEntry}, cannot debit ${newAmount}`);
      }
    }

    await entry.update(body);
    return success("Ledger entry updated");
  } catch (err: any) {
    return error(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to update ledger entry");
  }
}

export async function deleteLedgerEntry(req: FastifyRequest) {
  try {
    const { id } = req.params as { id: number };
    const entry = await Ledger.findByPk(id);
    if (!entry) return error(404, "Ledger entry not found");

    await entry.destroy();
    return success("Ledger entry deleted");
  } catch (err: any) {
    return error(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to delete ledger entry");
  }
}
