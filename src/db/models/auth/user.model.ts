import { Table, Column, Model, DataType } from "sequelize-typescript";

@Table({ tableName: "users", timestamps: true })
export class User extends Model {
  @Column({ type: DataType.INTEGER, autoIncrement: true, primaryKey: true })
  declare id: number;

  @Column({ type: DataType.STRING(150), allowNull: false })
  full_name!: string;

  @Column({ type: DataType.STRING(15), allowNull: false, unique: true })
  mobile_number!: string;

  @Column({ type: DataType.STRING(50), allowNull: false, unique: true })
  username!: string;

  @Column({ type: DataType.STRING(191), allowNull: false, unique: true })
  email!: string;

  @Column({ type: DataType.STRING(255), allowNull: false })
  password_hash!: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  password_plain!: string | null;

  @Column({ type: DataType.STRING(500), allowNull: true })
  profile_pic!: string | null;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
  is_active!: boolean;
}
