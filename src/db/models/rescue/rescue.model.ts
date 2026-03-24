import { Table, Column, Model, DataType, HasMany, BelongsTo, ForeignKey, BelongsToMany } from "sequelize-typescript";
import { User } from "../auth/user.model";
import { RescueImage } from "./rescue-image.model";
import { RescuePerson } from "./rescue-person.model";

@Table({ tableName: "rescues", timestamps: true })
export class Rescue extends Model {
  @Column({ type: DataType.INTEGER, autoIncrement: true, primaryKey: true })
  declare id: number;

  @Column({ type: DataType.STRING(100), allowNull: false })
  animal_type!: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  animal_description!: string | null;

  @Column({ type: DataType.STRING(150), allowNull: false })
  info_provider_name!: string;

  @Column({ type: DataType.STRING(15), allowNull: false })
  info_provider_number!: string;

  @ForeignKey(() => User)
  @Column({ type: DataType.INTEGER, allowNull: true })
  info_provider_user_id!: number | null;

  @Column({ type: DataType.TEXT, allowNull: false })
  from_address!: string;

  @Column({ type: DataType.STRING(10), allowNull: true })
  from_pincode!: string | null;

  @Column({ type: DataType.STRING(200), allowNull: true })
  from_area!: string | null;

  @Column({ type: DataType.TEXT, allowNull: false })
  to_address!: string;

  @Column({ type: DataType.STRING(10), allowNull: true })
  to_pincode!: string | null;

  @Column({ type: DataType.STRING(200), allowNull: true })
  to_area!: string | null;

  @Column({ type: DataType.ENUM("pending", "in_progress", "completed", "cancelled"), allowNull: false, defaultValue: "pending" })
  status!: "pending" | "in_progress" | "completed" | "cancelled";

  @ForeignKey(() => User)
  @Column({ type: DataType.INTEGER, allowNull: true })
  created_by!: number | null;

  @HasMany(() => RescueImage, { onDelete: "CASCADE" })
  images?: RescueImage[];

  @HasMany(() => RescuePerson, { onDelete: "CASCADE" })
  rescue_persons?: RescuePerson[];

  @BelongsTo(() => User, { foreignKey: "created_by", as: "creator" })
  creator?: User;

  @BelongsToMany(() => User, () => RescuePerson)
  persons?: User[];
}
