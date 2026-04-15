import { config } from "./src/config";
import { buildApp } from "./src/app";

async function startServer() {
  try {

    const app = await buildApp();
    await app.listen({ port: config.app.port, host: "0.0.0.0" });

    console.log(`🚀 Server running at port ${config.app.port}`);

  } catch (err) {
    console.log("❌ Failed to start server", err);
    process.exit(1);
  }
}

startServer();