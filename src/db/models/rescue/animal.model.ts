import { Table, Column, Model, DataType } from "sequelize-typescript";

@Table({ tableName: "animals", timestamps: true })
export class Animal extends Model {
  @Column({ type: DataType.INTEGER, autoIncrement: true, primaryKey: true })
  declare id: number;

  @Column({ type: DataType.STRING(100), allowNull: false, unique: true })
  name!: string;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
  is_active!: boolean;
}
