// validate.ts
import type { FastifyReply, FastifyRequest, preHandlerHookHandler } from "fastify";
import { ZodError, type ZodIssue, type ZodTypeAny } from "zod";
import { error, type FieldError } from "./response";
import { HttpStatus } from "./status";
import { config } from "../../config";

type ValidateTarget = "body" | "query" | "params";

export interface ValidateOptions {
    body?: ZodTypeAny;
    query?: ZodTypeAny;
    params?: ZodTypeAny;
}

type NormalizedFieldError = FieldError & {
    code?: ZodIssue["code"];
    expected?: unknown;
    received?: unknown;
};

function prettifyField(field: string) {
    // "body.email" -> "Email"
    const last = field.split(".").pop() || field;
    return last.charAt(0).toUpperCase() + last.slice(1);
}

function formatZodErrors(zodError: ZodError, prefix?: ValidateTarget): NormalizedFieldError[] {
    return zodError.errors.map((issue) => {
        const path = issue.path.join(".") || "root";
        const field = prefix ? `${prefix}.${path}`.replace(`${prefix}.root`, prefix) : path;

        return {
            field,
            message: issue.message,
            code: issue.code,
            expected: (issue as any).expected,
            received: (issue as any).received,
        };
    });
}

function normalizeMessage(err: NormalizedFieldError) {
    const label = prettifyField(err.field);

    // Required / missing
    if (
        err.message === "Required" ||
        (err.code === "invalid_type" && err.received === "undefined")
    ) {
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
export function validate(
    schemaOrOptions: ZodTypeAny | ValidateOptions,
    target: ValidateTarget = "body"
): preHandlerHookHandler {
    // normalize input
    const options: ValidateOptions =
        "parse" in schemaOrOptions ? { [target]: schemaOrOptions } : schemaOrOptions;

    return async (req: FastifyRequest, reply: FastifyReply) => {
        const allErrors: NormalizedFieldError[] = [];

        const validatePart = (schema: ZodTypeAny | undefined, value: unknown, key: ValidateTarget) => {
            if (!schema) return;

            const result = schema.safeParse(value);
            if (!result.success) {
                allErrors.push(...formatZodErrors(result.error, key));
            } else {
                (req as any)[key] = result.data;
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
            return reply.status(HttpStatus.BAD_REQUEST).send(error(HttpStatus.BAD_REQUEST, message));
        }
    };
}

// Optional helpers (same as your original exports)
export const validateBody = validate;
export function validateQuery(schema: ZodTypeAny): preHandlerHookHandler {
    return validate(schema, "query");
}
export function validateParams(schema: ZodTypeAny): preHandlerHookHandler {
    return validate(schema, "params");
}