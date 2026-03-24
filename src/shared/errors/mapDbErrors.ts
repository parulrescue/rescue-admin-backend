import { AppError } from "./appError";

export function mapDbError(err: unknown): AppError | null {
  if (!err || typeof err !== "object") {
    return null;
  }

  const anyErr = err as any;

  // Unique constraint violation
  if (anyErr.code === "23505") {
    return new AppError({ code: 409, message: "Resource already exists", details: { constraint: anyErr.constraint, table: anyErr.table } });
  }

  // Foreign key violation
  if (anyErr.code === "23503") {
    return new AppError({ code: 400, message: "Invalid reference", details: { constraint: anyErr.constraint, table: anyErr.table } });
  }

  // Not-null violation
  if (anyErr.code === "23502") {
    return new AppError({ code: 400, message: "Missing required field", details: { column: anyErr.column, table: anyErr.table } });
  }

  // Fallback for generic DB errors
  if (anyErr.code && typeof anyErr.code === "string") {
    return new AppError({ code: 500, message: "Database error", details: { dbCode: anyErr.code } });
  }

  return null;
}