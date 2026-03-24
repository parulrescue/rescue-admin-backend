import crypto from "crypto";
import { config } from "../../config";

export function generateResetToken(): { raw: string; hash: string } {
  const raw = crypto.randomUUID();
  const hash = crypto.createHash("sha256").update(raw).digest("hex");
  return { raw, hash };
}

export function hashResetToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

// AES-256-CBC encryption for admin plain passwords
const AES_ALGORITHM = "aes-256-cbc";

export function encryptAES(plainText: string): string {
  const key = Buffer.from(config.security.aesSecretKey, "utf8").subarray(0, 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(AES_ALGORITHM, key, iv);
  let encrypted = cipher.update(plainText, "utf8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + ":" + encrypted;
}

export function decryptAES(encryptedText: string): string {
  const key = Buffer.from(config.security.aesSecretKey, "utf8").subarray(0, 32);
  const [ivHex, encrypted] = encryptedText.split(":") as [string, string];
  const iv = Buffer.from(ivHex, "hex");
  const decipher = crypto.createDecipheriv(AES_ALGORITHM, key, iv);
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}
