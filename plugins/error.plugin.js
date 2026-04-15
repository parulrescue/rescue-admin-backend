"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorPlugin = void 0;
const fastify_plugin_1 = __importDefault(require("fastify-plugin"));
const zod_1 = require("zod");
const appError_1 = require("../shared/errors/appError");
const mapDbErrors_1 = require("../shared/errors/mapDbErrors");
const status_1 = require("../shared/http/status");
const response_1 = require("../shared/http/response");
const isFastifyError = (e) => typeof e === "object" && e !== null && "message" in e;
const zodMessage = (e) => e.errors.map(i => `${i.path.at(-1)?.toString().replace(/^\w/, c => c.toUpperCase())} ${i.message.toLowerCase()}`).join(", ");
exports.errorPlugin = (0, fastify_plugin_1.default)(async (app) => {
    app.setNotFoundHandler((req, reply) => reply.status(status_1.HttpStatus.NOT_FOUND).send((0, response_1.error)(status_1.HttpStatus.NOT_FOUND, "Route not found")));
    app.setErrorHandler((err, req, reply) => {
        if (err instanceof zod_1.ZodError)
            return reply.status(status_1.HttpStatus.BAD_REQUEST).send((0, response_1.error)(status_1.HttpStatus.BAD_REQUEST, zodMessage(err)));
        if (err instanceof appError_1.AppError)
            return reply.status(err.code).send((0, response_1.error)(err.code, err.message));
        const db = (0, mapDbErrors_1.mapDbError)(err);
        if (db)
            return reply.status(db.code).send((0, response_1.error)(db.code, db.message));
        const code = isFastifyError(err) && typeof err.code === "number" ? err.code : status_1.HttpStatus.INTERNAL_SERVER_ERROR;
        return reply.status(code).send(code == status_1.HttpStatus.INTERNAL_SERVER_ERROR ? (0, response_1.serverError)("Internal server error") : (0, response_1.error)(code, err.message));
    });
});
