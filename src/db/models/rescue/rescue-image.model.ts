import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from "sequelize-typescript";
import { Rescue } from "./rescue.model";

@Table({ tableName: "rescue_images", timestamps: true })
export class RescueImage extends Model {
  @Column({ type: DataType.INTEGER, autoIncrement: true, primaryKey: true })
  declare id: number;

  @ForeignKey(() => Rescue)
  @Column({ type: DataType.INTEGER, allowNull: false })
  rescue_id!: number;

  @Column({ type: DataType.STRING(500), allowNull: false })
  image_url!: string;

  @Column({ type: DataType.STRING(10), allowNull: false, defaultValue: "image" })
  media_type!: "image" | "video";

  @Column({ type: DataType.SMALLINT, allowNull: false, defaultValue: 0 })
  sort_order!: number;



  @BelongsTo(() => Rescue, { onDelete: "CASCADE" })
  rescue?: Rescue;
}
