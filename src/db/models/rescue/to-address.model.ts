import { Table, Column, Model, DataType } from "sequelize-typescript";

@Table({ tableName: "to_addresses", timestamps: true })
export class ToAddress extends Model {
  @Column({ type: DataType.INTEGER, autoIncrement: true, primaryKey: true })
  declare id: number;

  @Column({ type: DataType.STRING(200), allowNull: false })
  title!: string;

  @Column({ type: DataType.TEXT, allowNull: false })
  address!: string;

  @Column({ type: DataType.STRING(10), allowNull: true })
  pincode!: string | null;

  @Column({ type: DataType.STRING(200), allowNull: true })
  area!: string | null;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
  is_active!: boolean;
}
