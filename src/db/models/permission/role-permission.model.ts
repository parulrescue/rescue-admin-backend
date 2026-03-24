import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from "sequelize-typescript";
import { Role } from "./role.model";
import { Permission } from "./permission.model";

@Table({ tableName: "role_permissions", timestamps: true })
export class RolePermission extends Model {
  @Column({ type: DataType.INTEGER, autoIncrement: true, primaryKey: true })
  declare id: number;

  @ForeignKey(() => Role)
  @Column({ type: DataType.INTEGER, allowNull: false })
  role_id!: number;

  @ForeignKey(() => Permission)
  @Column({ type: DataType.INTEGER, allowNull: false })
  permission_id!: number;

  @BelongsTo(() => Role, { onDelete: "CASCADE" })
  role?: Role;

  @BelongsTo(() => Permission, { onDelete: "CASCADE" })
  permission?: Permission;
}
