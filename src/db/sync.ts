import "reflect-metadata";
import "../config/env";
import { sequelize } from "./index";

async function syncDatabase() {
  try {
    await sequelize.authenticate();
    console.log("✅ Database connected");

    await sequelize.sync({ alter: true });
    console.log("✅ Database synced successfully");

    await sequelize.close();
  } catch (err) {
    console.error("❌ Database sync failed", err);
    process.exit(1);
  }
}

syncDatabase();
