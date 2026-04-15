"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestIdPlugin = void 0;
const fastify_plugin_1 = __importDefault(require("fastify-plugin"));
exports.requestIdPlugin = (0, fastify_plugin_1.default)(async (app) => {
    app.addHook("onRequest", async (request) => {
        const incomingId = request.headers["x-request-id"];
        if (typeof incomingId === "string") {
            request.id = incomingId;
        }
    });
    // app.decorateRequest("requestId", "");
    app.decorate("requestId", "");
    app.addHook("preHandler", async (request) => {
        request.requestId = request.id;
    });
});
