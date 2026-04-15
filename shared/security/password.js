"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashPassword = hashPassword;
exports.verifyPassword = verifyPassword;
const bcrypt_1 = __importDefault(require("bcrypt"));
const config_1 = require("../../config");
async function hashPassword(plain) {
    return bcrypt_1.default.hash(plain, config_1.config.security.bcryptSaltRounds);
}
async function verifyPassword(plain, hash) {
    return bcrypt_1.default.compare(plain, hash);
}
