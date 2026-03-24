import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from "sequelize-typescript";
import { Rescue } from "./rescue.model";
import { User } from "../auth/user.model";

@Table({ tableName: "rescue_persons", timestamps: true })
export class RescuePerson extends Model {
  @Column({ type: DataType.INTEGER, autoIncrement: true, primaryKey: true })
  declare id: number;

  @ForeignKey(() => Rescue)
  @Column({ type: DataType.INTEGER, allowNull: false })
  rescue_id!: number;

  @ForeignKey(() => User)
  @Column({ type: DataType.INTEGER, allowNull: true })
  user_id!: number | null;

  @BelongsTo(() => Rescue, { onDelete: "CASCADE" })
  rescue?: Rescue;

  @BelongsTo(() => User, { onDelete: "SET NULL" })
  user?: User;
}
