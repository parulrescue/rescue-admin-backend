import { Table, Column, Model, DataType } from "sequelize-typescript";

@Table({ tableName: "sessions", timestamps: true })
export class Session extends Model {
  @Column({ type: DataType.INTEGER, autoIncrement: true, primaryKey: true })
  declare id: number;

  @Column({ type: DataType.INTEGER, allowNull: false })
  user_id!: number;

  @Column({ type: DataType.ENUM("user", "admin"), allowNull: false })
  user_type!: "user" | "admin";

  @Column({ type: DataType.STRING(255), allowNull: false, unique: true })
  token_hash!: string;

  @Column({ type: DataType.STRING(500), allowNull: true })
  device_info!: string | null;

  @Column({ type: DataType.STRING(45), allowNull: true })
  ip_address!: string | null;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
  is_active!: boolean;

  @Column({ type: DataType.DATE, allowNull: false })
  expires_at!: Date;

}