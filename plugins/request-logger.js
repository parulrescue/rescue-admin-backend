"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestLoggerPlugin = void 0;
const fastify_plugin_1 = __importDefault(require("fastify-plugin"));
const moment_1 = __importDefault(require("moment"));
const config_1 = require("../config");
const SENSITIVE = new Set([
    "password",
    "passwordhash",
    "oldpassword",
    "newpassword",
    "confirmpassword",
    "token",
    "accesstoken",
    "refreshtoken",
    "secret",
    "apikey",
    "apisecret",
    "creditcard",
    "cvv",
    "ssn",
    "pin",
].map((x) => x.toLowerCase()));
function sanitize(v) {
    if (v === null || typeof v !== "object")
        return v;
    if (Array.isArray(v))
        return v.map(sanitize);
    const o = v;
    const out = {};
    for (const k of Object.keys(o))
        out[k] = SENSITIVE.has(k.toLowerCase()) ? "[REDACTED]" : sanitize(o[k]);
    return out;
}
async function base(req, reply) {
    let client = req.clientInfo;
    return {
        request_id: req.id,
        ip_address: client.ipv4,
        client,
        user_id: req.userId ?? null,
        endpoint: req.url.split("?")[0],
        full_url: `${req.protocol}://${req.hostname}${req.url}`,
        payload: req.body ? sanitize(req.body) : null,
        query: req.query && Object.keys(req.query).length ? req.query : null,
        params: req.params && Object.keys(req.params).length ? req.params : null,
        method: req.method,
        authorised: Boolean(req.userId),
        timestamp: await (0, moment_1.default)().format('YYYY-MM-DD HH:mm:ss'),
        status_code: reply.statusCode || 500,
        response_time_ms: Math.round(reply.elapsedTime * 100) / 100,
    };
}
exports.requestLoggerPlugin = (0, fastify_plugin_1.default)(async (app) => {
    // ✅ capture response payload
    app.addHook("onSend", async (req, reply, payload) => {
        reply.responseData = payload;
        return payload;
    });
    app.addHook("onResponse", async (req, reply) => {
        const responseData = reply.responseData ?? null;
        if (reply.statusCode === 200 || reply.statusCode === 201) {
            if (config_1.config.logging.captureSuccess) {
                req.log.info({
                    ...base(req, reply),
                    responseData,
                    message: JSON.parse(reply?.responseData)?.success?.message || "unknown",
                });
            }
        }
        else {
            if (reply.statusCode < 500 && config_1.config.logging.captureErrors) {
                req.log.error({
                    ...base(req, reply),
                    responseData,
                    error: JSON.parse(reply?.responseData)?.error?.message ?? "Error",
                    message: JSON.parse(reply?.responseData)?.error?.message || "unknown",
                });
            }
        }
    });
    app.addHook("onError", async (req, reply, err) => {
        if (config_1.config.logging.captureErrors) {
            const responseData = reply.responseData ?? null; // ⚠️ usually null
            console.log('on error');
            req.log.error({
                ...base(req, reply),
                responseData, // will be null on real errors
                db_model: err?.dbModel ?? null,
                error: err?.name ?? "Error",
                message: err?.message ?? "error",
            });
        }
    });
});
