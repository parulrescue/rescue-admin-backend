import { Table, Column, Model, DataType } from "sequelize-typescript";

export type LogType = "INFO" | "ERROR" | "ALL";
export type ExportStatus = "pending" | "completed" | "failed";

@Table({ tableName: "log_exports", timestamps: true })
export class LogExport extends Model<LogExport> {
  @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4, primaryKey: true })
  declare id: string;

  @Column({ type: DataType.STRING(50), allowNull: false })
  environment!: string;

  @Column({ type: DataType.STRING(10), allowNull: false })
  date!: string;

  @Column({ type: DataType.ENUM("INFO", "ERROR", "ALL"), allowNull: false, field: "log_type" })
  log_type!: LogType;

  @Column({ type: DataType.ENUM("pending", "completed", "failed"), allowNull: false, defaultValue: "completed" })
  status!: ExportStatus;

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0, field: "total_records" })
  total_records!: number;

  @Column({ type: DataType.TEXT, allowNull: true, field: "file_path" })
  file_path?: string | null;

  @Column({ type: DataType.JSON, allowNull: true })
  filters?: {
    level?: string;
    startTime?: string;
    endTime?: string;
    keyword?: string;
    requestId?: string;
    statusCode?: number;
  } | null;

  @Column({ type: DataType.STRING(255), allowNull: true, field: "exported_by" })
  exported_by?: string | null;

  @Column({ type: DataType.TEXT, allowNull: true, field: "error_message" })
  error_message?: string | null;
}
