import { z } from "zod";

export const GetExportHistoryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  environment: z.string().optional(),
  date: z.string().optional(),
  logType: z.enum(["INFO", "ERROR", "ALL"]).optional(),
});

export const GetAvailableDatesQuerySchema = z.object({
  environment: z.string().optional(),
});

export const FilterLogsQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  level: z.enum(["INFO", "ERROR"]).optional(),
});

export type GetExportHistoryQuery = z.infer<typeof GetExportHistoryQuerySchema>;
export type FilterLogsQuery = z.infer<typeof FilterLogsQuerySchema>;