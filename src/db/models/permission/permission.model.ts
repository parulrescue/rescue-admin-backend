import { Table, Column, Model, DataType } from "sequelize-typescript";

@Table({ tableName: "permissions", timestamps: true })
export class Permission extends Model {
  @Column({ type: DataType.INTEGER, autoIncrement: true, primaryKey: true })
  declare id: number;

  @Column({ type: DataType.STRING(80), allowNull: false, unique: true })
  key!: string;

  @Column({ type: DataType.STRING(60), allowNull: false })
  module!: string;

  @Column({ type: DataType.STRING(255), allowNull: true })
  description!: string | null;
}
