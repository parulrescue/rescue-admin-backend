import "reflect-metadata";
import { Sequelize } from "sequelize-typescript";
import { config } from "../config";

import { User } from "./models/auth/user.model";
import { AdminUser } from "./models/auth/admin-user.model";
import { Session } from "./models/auth/session.model";
import { PasswordResetToken } from "./models/auth/password-reset-token.model";
import { Permission } from "./models/permission/permission.model";
import { AdminPermission } from "./models/permission/admin-permission.model";
import { Animal } from "./models/rescue/animal.model";
import { Rescue } from "./models/rescue/rescue.model";
import { RescueImage } from "./models/rescue/rescue-image.model";
import { RescuePerson } from "./models/rescue/rescue-person.model";
import { ToAddress } from "./models/rescue/to-address.model";
import { Ledger } from "./models/ledger/ledger.model";
import { LogExport } from "./models/logs/log-export.model";

export const sequelize = new Sequelize({
  host: config.database.host,
  port: config.database.port || 5432,
  username: config.database.user,
  password: config.database.password,
  database: config.database.name,
  dialect: "postgres",
  pool: {
    max: 5,     // keep LOW for pooler
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  dialectOptions: config.database.ssl
    ? { ssl: { rejectUnauthorized: false } }
    : {},
  logging: false,
  models: [
    User, AdminUser, Session, PasswordResetToken,
    Permission, AdminPermission,
    Animal, Rescue, RescueImage, RescuePerson, ToAddress,
    Ledger, LogExport,
  ],
});

export async function initDb() {
  try {
    await sequelize.authenticate();
    console.log("Database connected successfully");
    await sequelize.sync({ alter: true });
    console.log("Database synced with models");
  } catch (err) {
    console.error("Database connection failed", err);
    process.exit(1);
  }
}

export async function closeDb() {
  await sequelize.close();
  console.log("Database connection closed");
}
