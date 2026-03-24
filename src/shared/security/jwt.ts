import crypto from "crypto";
import { config } from "../../config";

interface JwtPayload {
  adminId: number;
  adminRole: "admin" | "sub_admin";
  sessionId: number;
}

function base64UrlEncode(data: string): string {
  return Buffer.from(data).toString("base64url");
}

function base64UrlDecode(data: string): string {
  return Buffer.from(data, "base64url").toString("utf8");
}

function sign(payload: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("base64url");
}

function parseExpiry(expiresIn: string): number {
  const match = expiresIn.match(/^(\d+)(h|m|d|s)$/);
  if (!match) return 48 * 60 * 60 * 1000;
  const val = parseInt(match[1]!, 10);
  const unit = match[2];
  switch (unit) {
    case "s": return val * 1000;
    case "m": return val * 60 * 1000;
    case "h": return val * 60 * 60 * 1000;
    case "d": return val * 24 * 60 * 60 * 1000;
    default: return 48 * 60 * 60 * 1000;
  }
}

export function generateToken(payload: JwtPayload): string {
  const secret = config.security.jwtSecret;
  const expiresIn = config.security.jwtExpiresIn;
  const expiryMs = parseExpiry(expiresIn);

  const header = base64UrlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = base64UrlEncode(JSON.stringify({
    ...payload,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor((Date.now() + expiryMs) / 1000),
  }));

  const signature = sign(`${header}.${body}`, secret);
  return `${header}.${body}.${signature}`;
}

export function verifyToken(token: string): JwtPayload & { iat: number; exp: number } {
  const secret = config.security.jwtSecret;
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Invalid token format");

  const [header, body, signature] = parts as [string, string, string];
  const expectedSig = sign(`${header}.${body}`, secret);

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
    throw new Error("Invalid token signature");
  }

  const payload = JSON.parse(base64UrlDecode(body));

  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error("Token expired");
  }

  return payload;
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function getExpiryDate(): Date {
  const expiryMs = parseExpiry(config.security.jwtExpiresIn);
  return new Date(Date.now() + expiryMs);
}
