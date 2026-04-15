"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.success = success;
exports.error = error;
exports.serverError = serverError;
const status_1 = require("./status");
function success(message, data = null, code = status_1.HttpStatus.OK) {
    return { success: { status: true, code, message }, data, error: null };
}
function error(code, message) {
    return { error: { status: false, code, message }, success: null, data: null };
}
function serverError(error) {
    return { error: { status: false, code: status_1.HttpStatus.INTERNAL_SERVER_ERROR, message: 'Internal Server Error!' }, success: null, data: null };
}
