import { Table, Column, Model, DataType } from "sequelize-typescript";

@Table({ tableName: "password_reset_tokens", timestamps: true })
export class PasswordResetToken extends Model {
  @Column({ type: DataType.INTEGER, autoIncrement: true, primaryKey: true })
  declare id: number;

  @Column({ type: DataType.INTEGER, allowNull: false })
  user_id!: number;

  @Column({ type: DataType.ENUM("user", "admin"), allowNull: false })
  user_type!: "user" | "admin";

  @Column({ type: DataType.STRING(255), allowNull: false, unique: true })
  token_hash!: string;

  @Column({ type: DataType.DATE, allowNull: false })
  expires_at!: Date;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
  used!: boolean;

}