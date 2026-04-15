"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.clientInfoPlugin = void 0;
const fastify_plugin_1 = __importDefault(require("fastify-plugin"));
const ua_parser_js_1 = require("ua-parser-js");
function extractClientIp(req) {
    const xfwd = req.headers["x-forwarded-for"];
    if (typeof xfwd === "string" && xfwd.trim().length > 0) {
        return xfwd.split(",")[0]?.trim() ?? null;
    }
    const xRealIp = req.headers["x-real-ip"];
    if (typeof xRealIp === "string" && xRealIp.trim().length > 0) {
        return xRealIp.trim();
    }
    return typeof req.ip === "string" ? req.ip : null;
}
function toIpv4(ip) {
    if (!ip)
        return null;
    const cleaned = ip.split("%")[0] ?? ""; // always string
    // plain IPv4
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(cleaned))
        return cleaned;
    // IPv4-mapped IPv6: ::ffff:127.0.0.1
    const m = cleaned.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i);
    if (m && m[1])
        return m[1];
    return null;
}
function normalizeDeviceType(t) {
    const v = (t ?? "").toLowerCase();
    if (v === "mobile" || v === "tablet" || v === "wearable" || v === "console" || v === "embedded") {
        return v;
    }
    if (v === "unknown")
        return "unknown";
    // UAParser usually omits type for desktop browsers
    return "desktop";
}
exports.clientInfoPlugin = (0, fastify_plugin_1.default)(async (app) => {
    app.decorateRequest("clientInfo", null);
    app.addHook("onRequest", async (req) => {
        const userAgentHeader = req.headers["user-agent"];
        const userAgent = typeof userAgentHeader === "string" ? userAgentHeader : null;
        const parser = new ua_parser_js_1.UAParser(userAgent ?? "");
        const r = parser.getResult();
        const ip = extractClientIp(req);
        const ipv4 = toIpv4(ip);
        req.clientInfo = {
            ip,
            ipv4,
            user_agent: userAgent,
            device: {
                type: normalizeDeviceType(r.device?.type),
                vendor: r.device?.vendor ?? null,
                model: r.device?.model ?? null,
            },
            browser: {
                name: r.browser?.name ?? null,
                version: r.browser?.version ?? null,
            },
            os: {
                name: r.os?.name ?? null,
                version: r.os?.version ?? null,
            },
        };
    });
});
