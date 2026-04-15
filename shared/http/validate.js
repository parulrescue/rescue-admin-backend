"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateBody = void 0;
exports.validate = validate;
exports.validateQuery = validateQuery;
exports.validateParams = validateParams;
const response_1 = require("./response");
const status_1 = require("./status");
function prettifyField(field) {
    // "body.email" -> "Email"
    const last = field.split(".").pop() || field;
    return last.charAt(0).toUpperCase() + last.slice(1);
}
function formatZodErrors(zodError, prefix) {
    return zodError.errors.map((issue) => {
        const path = issue.path.join(".") || "root";
        const field = prefix ? `${prefix}.${path}`.replace(`${prefix}.root`, prefix) : path;
        return {
            field,
            message: issue.message,
            code: issue.code,
            expected: issue.expected,
            received: issue.received,
        };
    });
}
function normalizeMessage(err) {
    const label = prettifyField(err.field);
    // Required / missing
    if (err.message === "Required" ||
        (err.code === "invalid_type" && err.received === "undefined")) {
        return `${label} is required`;
    }
    // null provided
    if (err.code === "invalid_type" && err.received === "null") {
        const exp = typeof err.expected === "string" ? err.expected : "valid value";
        return `${label} must be a ${exp}`;
    }
    // any type error
    if (err.code === "invalid_type") {
        const exp = typeof err.expected === "string" ? err.expected : "valid value";
        return `${label} must be a ${exp}`;
    }
    // all other Zod errors (too_small, invalid_string, custom refine, etc.)
    // 👉 ALWAYS prefix field name
    return `${label} :- ${err.message.charAt(0).toLowerCase()}${err.message.slice(1)}`;
}
/**
 * validate(schema) -> defaults to body
 * validate(schema, "query"|"params"|"body") -> validates only that part
 * validate({ body, query, params }) -> validates multiple parts
 */
function validate(schemaOrOptions, target = "body") {
    // normalize input
    const options = "parse" in schemaOrOptions ? { [target]: schemaOrOptions } : schemaOrOptions;
    return async (req, reply) => {
        const allErrors = [];
        const validatePart = (schema, value, key) => {
            if (!schema)
                return;
            const result = schema.safeParse(value);
            if (!result.success) {
                allErrors.push(...formatZodErrors(result.error, key));
            }
            else {
                req[key] = result.data;
            }
        };
        // validate requested parts (or multiple if options object)
        validatePart(options.params, req.params, "params");
        validatePart(options.query, req.query, "query");
        validatePart(options.body, req.body, "body");
        // console.log(allErrors, 'allErrors')
        if (allErrors.length > 0) {
            // your desired response: message is string
            const message = allErrors.map(normalizeMessage).join(", ");
            return reply.status(status_1.HttpStatus.BAD_REQUEST).send((0, response_1.error)(status_1.HttpStatus.BAD_REQUEST, message));
        }
    };
}
// Optional helpers (same as your original exports)
exports.validateBody = validate;
function validateQuery(schema) {
    return validate(schema, "query");
}
function validateParams(schema) {
    return validate(schema, "params");
}
