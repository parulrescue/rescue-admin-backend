import { loadDotEnv } from "../env";
loadDotEnv();

const logDir = `${process.cwd()}/logs`;

const prodConfig = {
  app: {
    name: "admin-backend",
    env: "prod",
    port: Number(process.env.PORT) || 5556,
    timezone: process.env.TIMEZONE || "Asia/Kolkata",
  },

  database: {
    host: process.env.PROD_DATABASE_HOST || "",
    port: Number(process.env.PROD_DATABASE_PORT || "5432"),
    user: process.env.PROD_DATABASE_USER || "postgres",
    password: process.env.PROD_DATABASE_PASSWORD || "postgres",
    name: process.env.PROD_DATABASE_NAME || "",
    ssl: true,
  },

  logging: {
    captureErrors: true,
    captureSuccess: true,
    dir: logDir,
    exportDir: `${process.cwd()}/exports`,
  },

  security: {
    jwtSecret: process.env.JWT_SECRET || "admin-jwt",
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || "48h",
    bcryptSaltRounds: Number(process.env.BCRYPT_ROUNDS) || 12,
    aesSecretKey: process.env.AES_SECRET_KEY || "",
  },

  smtp: {
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT) || 587,
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
    from: process.env.SMTP_FROM || "Animal Rescue <rescue@parulgauseva.com>",
  },

  upload: {
    fileAccessUrl: process.env.FILE_ACCESS_URL || "",
  },

  cors: {
    adminFrontendUrl: process.env.ADMIN_FRONTEND_URL || "",
    frontendUrl: process.env.FRONTEND_URL || "",
  },
};

export default prodConfig;
