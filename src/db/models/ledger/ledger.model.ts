import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from "sequelize-typescript";
import { AdminUser } from "../auth/admin-user.model";

@Table({ tableName: "ledger", timestamps: true })
export class Ledger extends Model {
  @Column({ type: DataType.INTEGER, autoIncrement: true, primaryKey: true })
  declare id: number;

  @Column({ type: DataType.ENUM("credit", "debit"), allowNull: false })
  type!: "credit" | "debit";

  @Column({ type: DataType.DECIMAL(12, 2), allowNull: false })
  amount!: number;

  @Column({ type: DataType.STRING(100), allowNull: true })
  category!: string | null;

  @Column({ type: DataType.TEXT, allowNull: true })
  description!: string | null;

  @Column({ type: DataType.STRING(100), allowNull: true })
  reference_id!: string | null;

  @Column({ type: DataType.STRING(500), allowNull: true })
  photo_url!: string | null;

  @ForeignKey(() => AdminUser)
  @Column({ type: DataType.INTEGER, allowNull: false })
  created_by!: number;

  @BelongsTo(() => AdminUser, { foreignKey: "created_by" })
  creator?: AdminUser;
}
