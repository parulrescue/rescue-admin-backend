import Fastify from "fastify";
import { randomUUID } from "crypto";
import path from "path";
import fs from "fs";

import { config } from "./config";

// plugins
import { requestIdPlugin } from "./plugins/requestId.plugin";
import { errorPlugin } from "./plugins/error.plugin";
import { dbPlugin } from "./plugins/db.plugin";
import { requestLoggerPlugin } from "./plugins/request-logger";
import { clientInfoPlugin } from "./plugins/client-info.plugin";

// fastify plugins
import fastifyCors from "@fastify/cors";
import fastifyMultipart from "@fastify/multipart";
import fastifyRateLimit from "@fastify/rate-limit";
import fastifyStatic from "@fastify/static";
import fastifyHelmet from "@fastify/helmet";

// modules
import { authRoutes } from "./modules/auth/routes";
import { userRoutes } from "./modules/user/routes";
import { subAdminRoutes } from "./modules/sub-admin/routes";
// role routes removed — permissions assigned directly to sub-admins
import { rescueRoutes } from "./modules/rescue/routes";
import { animalRoutes } from "./modules/animal/routes";
import { toAddressRoutes } from "./modules/to-address/routes";
import { ledgerRoutes } from "./modules/ledger/routes";
import { dashboardRoutes } from "./modules/dashboard/routes";
import { logExportRoutes } from "./modules/log-export/routes";

// logger + env
import { createFileLogger } from "./logger/pino";
import env_config from "./config/environments";

// db
import { closeDb, initDb } from "./db";

declare module "fastify" {
    interface FastifyReply {
        responseData?: unknown;
    }
    interface FastifyRequest {
        adminId?: number;
        adminRole?: "admin" | "sub_admin";
        sessionId?: number;
    }
}

export async function buildApp() {
    const { logger, files } = createFileLogger({
        baseDir: env_config?.logging?.dir,
        level: "info",
    });

    await initDb();

    const app = Fastify({
        logger,
        trustProxy: true,
        genReqId: () => randomUUID(),
        disableRequestLogging: true,
    });

    // CORS — whitelist admin frontend + user frontend URLs
    app.register(fastifyCors, {
        origin: [config.cors.adminFrontendUrl, config.cors.frontendUrl],
        credentials: true,
    });

    // Helmet — security headers
    app.register(fastifyHelmet, {
        contentSecurityPolicy: false,
        crossOriginResourcePolicy: { policy: "cross-origin" },
    });

    // Multipart — file uploads
    app.register(fastifyMultipart, {
        limits: {
            fileSize: 100 * 1024 * 1024, // 100MB (for video uploads)
            files: 10,
        },
    });

    // Rate limiting — 100 req/min per IP
    app.register(fastifyRateLimit, {
        max: 100,
        timeWindow: "1 minute",
    });

    // Static file serving for uploads (legacy)
    const uploadDir = path.resolve(config.upload.dir);
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

    app.register(fastifyStatic, {
        root: uploadDir,
        prefix: "/uploads/",
        decorateReply: false,
    });

    // Static file serving for public/ directory
    const publicDir = path.join(process.cwd(), "public");
    if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

    app.register(fastifyStatic, {
        root: publicDir,
        prefix: "/public/",
        decorateReply: false,
    });

    // Logging + client info
    app.register(clientInfoPlugin);
    app.register(requestLoggerPlugin);

    // Graceful shutdown
    const shutdown = async () => {
        try {
            await app.close();
        } finally {
            try {
                files.close();
            } catch { }
            try {
                await closeDb();
            } catch { }
        }
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);

    // Core plugins
    app.register(requestIdPlugin);
    app.register(dbPlugin);
    app.register(errorPlugin);

    // API routes — /api/v1 prefix
    app.register(authRoutes, { prefix: "/api/v1/auth" });
    app.register(userRoutes, { prefix: "/api/v1/users" });
    app.register(subAdminRoutes, { prefix: "/api/v1/sub-admins" });
    // role routes removed — permissions assigned directly to sub-admins
    app.register(rescueRoutes, { prefix: "/api/v1/rescues" });
    app.register(animalRoutes, { prefix: "/api/v1/animals" });
    app.register(toAddressRoutes, { prefix: "/api/v1/to-addresses" });
    app.register(ledgerRoutes, { prefix: "/api/v1/ledger" });
    app.register(dashboardRoutes, { prefix: "/api/v1/dashboard" });
    app.register(logExportRoutes, { prefix: "/api/logs" });

    return app;
}
