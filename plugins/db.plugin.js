"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.dbPlugin = void 0;
const fastify_plugin_1 = __importDefault(require("fastify-plugin"));
const db_1 = require("../db");
exports.dbPlugin = (0, fastify_plugin_1.default)(async (app) => {
    app.decorate("db", db_1.sequelize);
});
