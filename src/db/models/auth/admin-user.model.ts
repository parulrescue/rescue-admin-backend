import { Table, Column, Model, DataType, HasMany, BelongsToMany } from "sequelize-typescript";
import { AdminPermission } from "../permission/admin-permission.model";
import { Permission } from "../permission/permission.model";

@Table({ tableName: "admin_users", timestamps: true })
export class AdminUser extends Model {
  @Column({ type: DataType.INTEGER, autoIncrement: true, primaryKey: true })
  declare id: number;

  @Column({ type: DataType.STRING(150), allowNull: false })
  full_name!: string;

  @Column({ type: DataType.STRING(15), allowNull: false })
  mobile_number!: string;

  @Column({ type: DataType.STRING(50), allowNull: false })
  username!: string;

  @Column({ type: DataType.STRING(191), allowNull: false })
  email!: string;

  @Column({ type: DataType.STRING(255), allowNull: false })
  password_hash!: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  password_plain!: string | null;

  @Column({ type: DataType.STRING(500), allowNull: true })
  profile_pic!: string | null;

  @Column({ type: DataType.ENUM("admin", "sub_admin"), allowNull: false })
  role!: "admin" | "sub_admin";

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
  is_active!: boolean;

  @HasMany(() => AdminPermission, { onDelete: "CASCADE" })
  admin_permissions?: AdminPermission[];

  @BelongsToMany(() => Permission, () => AdminPermission)
  permissions?: Permission[];
}
