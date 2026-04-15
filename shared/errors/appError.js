"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppError = void 0;
class AppError extends Error {
    code;
    details;
    constructor(params) {
        super(params.message);
        this.code = params.code;
        this.details = params.details;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.AppError = AppError;
