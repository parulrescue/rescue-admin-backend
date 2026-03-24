import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from "sequelize-typescript";
import { AdminUser } from "../auth/admin-user.model";
import { Permission } from "./permission.model";

@Table({ tableName: "admin_permissions", timestamps: true })
export class AdminPermission extends Model {
  @Column({ type: DataType.INTEGER, autoIncrement: true, primaryKey: true })
  declare id: number;

  @ForeignKey(() => AdminUser)
  @Column({ type: DataType.INTEGER, allowNull: false })
  admin_id!: number;

  @ForeignKey(() => Permission)
  @Column({ type: DataType.INTEGER, allowNull: false })
  permission_id!: number;

  @BelongsTo(() => AdminUser, { onDelete: "CASCADE" })
  admin?: AdminUser;

  @BelongsTo(() => Permission, { onDelete: "CASCADE" })
  permission?: Permission;
}
