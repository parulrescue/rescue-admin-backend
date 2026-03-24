import { config } from "./config";
import { buildApp } from "./app";

async function startServer() {
  try {

    const app =await buildApp();
    await app.listen({ port: config.app.port, host: "127.0.0.1" });

    console.log(`🚀 Server running at port ${config.app.port}`);

  } catch (err) {
    console.log("❌ Failed to start server", err);
    process.exit(1);
  }
}

startServer();