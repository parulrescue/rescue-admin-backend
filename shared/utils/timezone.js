"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTodayDate = getTodayDate;
exports.getTimestamp = getTimestamp;
exports.getTimezoneOffset = getTimezoneOffset;
const moment_timezone_1 = __importDefault(require("moment-timezone"));
const config_1 = require("../../config");
const TZ = config_1.config.app.timezone;
function getTodayDate() {
    return (0, moment_timezone_1.default)().tz(TZ).format("YYYY-MM-DD");
}
function getTimestamp() {
    return (0, moment_timezone_1.default)().tz(TZ).format("YYYY-MM-DD HH:mm:ss");
}
function getTimezoneOffset() {
    return (0, moment_timezone_1.default)().tz(TZ).format("Z");
}
