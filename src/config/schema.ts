import { z } from "zod";

export const AppEnvSchema = z.enum(["local", "prod"]);

export const ConfigSchema = z.object({
    app: z.object({
        name: z.string().min(1),
        env: AppEnvSchema,
        port: z.number().int().positive(),
        timezone: z.string().min(1).default("Asia/Kolkata"),
    }),

    database: z.object({
        host: z.string(),
        port: z.number(),
        user: z.string(),
        password: z.string(),
        name: z.string(),
        ssl: z.boolean(),
    }),

    logging: z.object({
        captureErrors: z.boolean(),
        captureSuccess: z.boolean().default(false),
        logDbErrors: z.boolean().default(false),
        dir: z.string().min(1),
        exportDir: z.string().optional(),
    }),

    security: z.object({
        jwtSecret: z.string().min(1),
        jwtExpiresIn: z.string().default("48h"),
        bcryptSaltRounds: z.number().int().min(4).max(20),
        aesSecretKey: z.string().min(32),
    }),

    smtp: z.object({
        host: z.string().min(1),
        port: z.number().int(),
        user: z.string().min(1),
        pass: z.string().min(1),
        from: z.string().min(1),
    }),

    cors: z.object({
        adminFrontendUrl: z.string().min(1),
        frontendUrl: z.string().min(1),
    }),
});

export type AppEnv = z.infer<typeof AppEnvSchema>;
export type AppConfig = z.infer<typeof ConfigSchema>;
