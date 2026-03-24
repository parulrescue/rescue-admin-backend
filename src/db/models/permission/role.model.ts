import { Table, Column, Model, DataType, HasMany, BelongsToMany } from "sequelize-typescript";
import { RolePermission } from "./role-permission.model";
import { Permission } from "./permission.model";

@Table({ tableName: "roles", timestamps: true })
export class Role extends Model {
  @Column({ type: DataType.INTEGER, autoIncrement: true, primaryKey: true })
  declare id: number;

  @Column({ type: DataType.STRING(100), allowNull: false, unique: true })
  name!: string;

  @Column({ type: DataType.STRING(255), allowNull: true })
  description!: string | null;

  @Column({ type: DataType.INTEGER, allowNull: false })
  created_by!: number;



  @HasMany(() => RolePermission, { onDelete: "CASCADE" })
  role_permissions?: RolePermission[];

  @BelongsToMany(() => Permission, () => RolePermission)
  permissions?: Permission[];
}
