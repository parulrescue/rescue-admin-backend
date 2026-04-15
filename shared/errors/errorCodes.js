"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorCodes = void 0;
exports.ErrorCodes = {
    // generic
    INTERNAL_ERROR: "INTERNAL_ERROR",
    REQUEST_ERROR: "REQUEST_ERROR",
    NOT_FOUND: "NOT_FOUND",
    VALIDATION_ERROR: "VALIDATION_ERROR",
    // auth
    UNAUTHORIZED: "UNAUTHORIZED",
    FORBIDDEN: "FORBIDDEN",
    INVALID_CREDENTIALS: "INVALID_CREDENTIALS",
    // database
    DB_ERROR: "DB_ERROR",
    DB_CONSTRAINT_VIOLATION: "DB_CONSTRAINT_VIOLATION",
    DB_NOT_FOUND: "DB_NOT_FOUND",
};
