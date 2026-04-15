"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateToken = generateToken;
exports.verifyToken = verifyToken;
exports.hashToken = hashToken;
exports.getExpiryDate = getExpiryDate;
const crypto_1 = __importDefault(require("crypto"));
const config_1 = require("../../config");
function base64UrlEncode(data) {
    return Buffer.from(data).toString("base64url");
}
function base64UrlDecode(data) {
    return Buffer.from(data, "base64url").toString("utf8");
}
function sign(payload, secret) {
    return crypto_1.default.createHmac("sha256", secret).update(payload).digest("base64url");
}
function parseExpiry(expiresIn) {
    const match = expiresIn.match(/^(\d+)(h|m|d|s)$/);
    if (!match)
        return 48 * 60 * 60 * 1000;
    const val = parseInt(match[1], 10);
    const unit = match[2];
    switch (unit) {
        case "s": return val * 1000;
        case "m": return val * 60 * 1000;
        case "h": return val * 60 * 60 * 1000;
        case "d": return val * 24 * 60 * 60 * 1000;
        default: return 48 * 60 * 60 * 1000;
    }
}
function generateToken(payload) {
    const secret = config_1.config.security.jwtSecret;
    const expiresIn = config_1.config.security.jwtExpiresIn;
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
function verifyToken(token) {
    const secret = config_1.config.security.jwtSecret;
    const parts = token.split(".");
    if (parts.length !== 3)
        throw new Error("Invalid token format");
    const [header, body, signature] = parts;
    const expectedSig = sign(`${header}.${body}`, secret);
    if (!crypto_1.default.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
        throw new Error("Invalid token signature");
    }
    const payload = JSON.parse(base64UrlDecode(body));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
        throw new Error("Token expired");
    }
    return payload;
}
function hashToken(token) {
    return crypto_1.default.createHash("sha256").update(token).digest("hex");
}
function getExpiryDate() {
    const expiryMs = parseExpiry(config_1.config.security.jwtExpiresIn);
    return new Date(Date.now() + expiryMs);
}
