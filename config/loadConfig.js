"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadConfig = loadConfig;
const schema_1 = require("./schema");
const env_1 = require("./env");
// environment configs
const local_1 = __importDefault(require("./environments/local"));
const uat_1 = __importDefault(require("./environments/uat"));
const prod_1 = __importDefault(require("./environments/prod"));
function loadConfig() {
    (0, env_1.loadDotEnv)();
    const env = (process.env.SERVER_MODE || "local");
    const configs = { local: local_1.default, uat: uat_1.default, prod: prod_1.default };
    const baseConfig = configs[env];
    if (!baseConfig) {
        throw new Error(`Invalid SERVER_MODE value: ${env}`);
    }
    const mergedConfig = { ...baseConfig };
    const parsed = schema_1.ConfigSchema.parse(mergedConfig);
    return Object.freeze(parsed);
}
