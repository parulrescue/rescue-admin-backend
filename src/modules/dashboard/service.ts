import { FastifyRequest } from "fastify";
import { Op } from "sequelize";
import { User } from "../../db/models/auth/user.model";
import { Rescue } from "../../db/models/rescue/rescue.model";
import { Ledger } from "../../db/models/ledger/ledger.model";
import { success, error } from "../../shared/http/response";
import { HttpStatus } from "../../shared/http/status";
import { sequelize } from "../../db";

export async function getDashboardStats(req: FastifyRequest) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalUsers, totalRescues, todayRescues] = await Promise.all([
      User.count(),
      Rescue.count(),
      Rescue.count({ where: { createdAt: { [Op.gte]: today } } }),
    ]);

    // Ledger balance
    const [balanceResult] = await sequelize.query(`
      SELECT COALESCE(SUM(CASE WHEN type = 'credit' THEN amount ELSE -amount END), 0) as net_balance
      FROM ledger
    `) as [any[], unknown];
    const netBalance = parseFloat(balanceResult[0]?.net_balance || "0");

    // Recent 5 rescues
    const recentRescues = await Rescue.findAll({
      attributes: ["id", "animal_type", "status", "createdAt"],
      order: [["createdAt", "DESC"]],
      limit: 5,
      raw: true,
    });

    // Recent 5 ledger entries
    const recentLedger = await Ledger.findAll({
      attributes: ["id", "type", "amount", "category", "createdAt"],
      order: [["createdAt", "DESC"]],
      limit: 5,
      raw: true,
    });

    return success("Dashboard stats fetched", {
      total_users: totalUsers,
      total_rescues: totalRescues,
      today_rescues: todayRescues,
      net_balance: netBalance,
      recent_rescues: recentRescues,
      recent_ledger: recentLedger,
    });
  } catch (err: any) {
    return error(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to fetch dashboard stats");
  }
}
