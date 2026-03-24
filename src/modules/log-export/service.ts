import { FastifyRequest } from "fastify";
import { readFileSync, existsSync, readdirSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import ExcelJS from "exceljs";
import { WhereOptions } from "sequelize";
import { config } from "../../config";
import { LogExport } from "../../db/models";
import { success, error } from "../../shared/http/response";
import { HttpStatus } from "../../shared/http/status";
import type { GetExportHistoryQuery, FilterLogsQuery } from "./dto";

interface LogEntry {
  level: number;
  time: string | number;
  pid: number;
  hostname: string;
  reqId?: string;
  request_id?: string;
  // Request info - can be nested or flat
  req?: {
    method: string;
    url: string;
    hostname: string;
  };
  res?: {
    statusCode: number;
  };
  // Flat request fields (your format)
  method?: string;
  endpoint?: string;
  full_url?: string;
  ip_address?: string;
  ip?: string;
  ipv4?: string;
  user_agent?: string;
  user_id?: string | null;
  payload?: unknown;
  params?: unknown;
  authorised?: boolean;
  // Response info - can be nested or flat
  responseTime?: number;
  response_time_ms?: number;
  status_code?: number;
  code?: number;
  status?: boolean;
  // Message field
  msg?: string;
  message?: string;
  // Error info
  err?: {
    type: string;
    message: string;
    stack: string;
  };
  error?: string | null;
  [key: string]: unknown;
}

interface ParsedLog {
  timestamp: string;
  level: string;
  levelNum: number;
  requestId: string;
  method: string;
  url: string;
  statusCode: number | null;
  responseTime: number | null;
  message: string;
  hostname: string;
  errorType: string | null;
  errorMessage: string | null;
  errorStack: string | null;
  raw: LogEntry;
}

const LEVEL_MAP: Record<number, string> = {
  10: "TRACE",
  20: "DEBUG",
  30: "INFO",
  40: "WARN",
  50: "ERROR",
  60: "FATAL",
};

function parseLogLine(line: string): ParsedLog | null {
  try {
    const entry: LogEntry = JSON.parse(line);

    // Handle both nested and flat formats
    const timestamp = typeof entry.time === "string"
      ? entry.time
      : new Date(entry.time).toISOString();

    return {
      timestamp,
      level: LEVEL_MAP[entry.level] || "UNKNOWN",
      levelNum: entry.level,
      requestId: entry.reqId || entry.request_id || "",
      method: entry.method || entry.req?.method || "",
      url: entry.endpoint || entry.full_url || entry.req?.url || "",
      statusCode: entry.status_code ?? entry.code ?? entry.res?.statusCode ?? null,
      responseTime: entry.response_time_ms ?? entry.responseTime ?? null,
      message: entry.message || entry.msg || "",
      hostname: entry.hostname || "",
      errorType: entry.err?.type || null,
      errorMessage: entry.err?.message || entry.error || null,
      errorStack: entry.err?.stack || null,
      raw: entry,
    };
  } catch {
    return null;
  }
}

export type FileDownloadResponse = {
  isFile: true;
  buffer: Buffer;
  fileName: string;
  contentType: string;
};

export async function getExportHistory(req: FastifyRequest) {
  try {
    const query = req.query as GetExportHistoryQuery;
    const offset = (query.page - 1) * query.limit;

    const where: WhereOptions = {};
    if (query.environment) where.environment = query.environment;
    if (query.date) where.date = query.date;
    if (query.logType) where.log_type = query.logType;

    const { count, rows: data } = await LogExport.findAndCountAll({
      where,
      order: [["createdAt", "DESC"]],
      limit: query.limit,
      offset,
      raw: true,
    });

    return success("Export history fetched successfully", { count, rows: data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return error(HttpStatus.INTERNAL_SERVER_ERROR, `Failed to fetch export history: ${message}`);
  }
}

export async function getAvailableDates(req: FastifyRequest) {
  try {
    const query = req.query as { environment?: string };
    const env = query.environment || config.app.env;
    const envLogDir = join(config.logging.dir, env);

    if (!existsSync(envLogDir)) {
      return success("Available dates fetched successfully", { environment: env, dates: [] });
    }

    const dates = readdirSync(envLogDir, { withFileTypes: true })
      .filter((dirent) => dirent.isDirectory() && /^\d{4}-\d{2}-\d{2}$/.test(dirent.name))
      .map((dirent) => {
        const dateDir = join(envLogDir, dirent.name);
        const hasInfo = existsSync(join(dateDir, "info.log"));
        const hasError = existsSync(join(dateDir, "error.log"));
        return {
          date: dirent.name,
          hasInfoLog: hasInfo,
          hasErrorLog: hasError,
        };
      })
      .sort((a, b) => b.date.localeCompare(a.date));

    return success("Available dates fetched successfully", { environment: env, dates });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return error(HttpStatus.INTERNAL_SERVER_ERROR, `Failed to fetch available dates: ${message}`);
  }
}

export async function getAvailableEnvironments() {
  try {
    const env = config.app.env;
    const logDir = `${config.logging.dir}/${env}`;

    if (!existsSync(logDir)) {
      return success("Available environments fetched successfully", { environments: [] });
    }

    const environments = readdirSync(logDir, { withFileTypes: true }).filter((dirent) => dirent.isDirectory()).map((dirent) => dirent.name);
    return success("Available environments fetched successfully", { environments });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return error(HttpStatus.INTERNAL_SERVER_ERROR, `Failed to fetch environments: ${message}`);
  }
}

function flattenObject(obj: Record<string, unknown>, prefix = ""): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}_${key}` : key;

    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      Object.assign(result, flattenObject(value as Record<string, unknown>, newKey));
    } else {
      result[newKey] = value;
    }
  }

  return result;
}

interface ColumnMapping {
  label: string;
  value: string;
}

const LOG_COLUMN_MAPPING: ColumnMapping[] = [
  { label: "Request ID", value: "request_id" },
  { label: "Level", value: "level" },
  { label: "Timestamp", value: "timestamp" },
  { label: "User ID", value: "user_id" },
  { label: "Authorised", value: "authorised" },
  { label: "Hostname", value: "hostname" },
  { label: "PID", value: "pid" },
  { label: "Payload", value: "payload" },
  { label: "Params", value: "params" },
  { label: "Method", value: "method" },
  { label: "Endpoint", value: "endpoint" },
  { label: "Full URL", value: "full_url" },
  { label: "Status Code", value: "status_code" },
  { label: "Response Time (ms)", value: "response_time_ms" },
  { label: "Response Data", value: "responseData" },
  { label: "Message", value: "message" },
  { label: "IP Address", value: "ip_address" },
  { label: "User Agent", value: "client_user_agent" },
  { label: "Device Type", value: "client_device_type" },
  { label: "Browser", value: "client_browser_name" },
  { label: "OS", value: "client_os_name" },
];

export async function filterLogs(req: FastifyRequest) {
  try {
    const query = req.query as FilterLogsQuery;
    const date = query.date;
    const level = query.level || "";
    const env = config.app.env;
    const logDir = join(config.logging.dir, env, date, level?.toLowerCase() + ".log");

    if (!existsSync(logDir)) {
      return error(HttpStatus.NOT_FOUND, `No logs found for ${date} in environment`);
    }

    const logs: ParsedLog[] = [];

    const filePath = join(logDir);
    if (existsSync(filePath)) {
      const content = readFileSync(filePath, "utf-8");
      const lines = content.split("\n").filter((l) => l.trim());
      for (const line of lines) {
        const parsed = parseLogLine(line);
        if (parsed) logs.push(parsed);
      }
    }

    // Sort by timestamp
    logs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    // Filter by level if provided
    const filteredLogs = query.level
      ? logs.filter((log) => log.level === query.level)
      : logs;

    // Flatten nested objects to key_value format
    const flattenedLogs = filteredLogs.map((log) => flattenObject(log.raw as Record<string, unknown>));

    // Generate Excel file and save to exports folder
    const exportDir = config.logging.exportDir || join(process.cwd(), "exports");
    if (!existsSync(exportDir)) {
      mkdirSync(exportDir, { recursive: true });
    }

    const excelBuffer = await convertToExcel(flattenedLogs, LOG_COLUMN_MAPPING);
    const fileName = `logs_${date}_${level || "all"}_${Date.now()}.xlsx`;
    const exportFilePath = join(exportDir, fileName);
    writeFileSync(exportFilePath, excelBuffer);

    // Save filter history to database
    await LogExport.create({
      environment: config.app.env,
      date,
      log_type: (query.level || "ALL") as "INFO" | "ERROR" | "ALL",
      status: "completed",
      total_records: flattenedLogs.length,
      file_path: exportFilePath,
      filters: query.level ? { level: query.level } : null,
      exported_by: (req as any).adminId || (req as any).userId || null,
    } as any);

    return success("Logs fetched successfully", {
      totalRecords: flattenedLogs.length,
      date,
      level: query.level || "all",
      logs: flattenedLogs,
      excel: {
        fileName,
        filePath: exportFilePath,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return error(HttpStatus.INTERNAL_SERVER_ERROR, `Failed to filter logs: ${message}`);
  }
}

export async function convertToExcel(data: Record<string, unknown>[], columnMapping: ColumnMapping[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Log Export System";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet("Data");

  // Set columns based on mapping
  worksheet.columns = columnMapping.map((col) => ({
    header: col.label,
    key: col.value,
    width: 25,
  }));

  // Style header row
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF2E7D32" },
  };
  headerRow.alignment = { vertical: "middle", horizontal: "center" };
  headerRow.height = 25;

  // Add data rows
  data.forEach((item, index) => {
    const rowData: Record<string, unknown> = {};
    columnMapping.forEach((col) => {
      rowData[col.value] = item[col.value] ?? "N/A";
    });

    const row = worksheet.addRow(rowData);
    row.alignment = { vertical: "middle", horizontal: "center" };

    // Alternate row colors
    if (index % 2 === 0) {
      row.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF5F5F5" },
      };
    }
  });

  // Auto-filter
  if (data.length > 0) {
    worksheet.autoFilter = {
      from: "A1",
      to: `${String.fromCharCode(64 + columnMapping.length)}${data.length + 1}`,
    };
  }

  // Freeze header row
  worksheet.views = [{ state: "frozen", ySplit: 1 }];

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer as ArrayBuffer);
}
