"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createFileLogger = createFileLogger;
const pino_1 = __importDefault(require("pino"));
const daily_files_1 = require("./daily-files");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
function createFileLogger(opts) {
    const files = new daily_files_1.DailyLogFiles(opts.baseDir);
    const baseDir = path_1.default.resolve(opts.baseDir); // absolute
    fs_1.default.mkdirSync(baseDir, { recursive: true });
    const stream = {
        write(chunk) {
            const line = chunk.endsWith("\n") ? chunk.slice(0, -1) : chunk;
            // pino writes JSON per line -> we route by numeric level
            try {
                const obj = JSON.parse(line);
                const lvl = typeof obj.level === "number" ? obj.level : 30; // default info
                files.write(lvl >= 50 ? "error" : "info", line); // 50=error, 60=fatal
            }
            catch {
                // if not JSON, still write somewhere
                files.write("info", line);
            }
        },
    };
    const logger = (0, pino_1.default)({
        level: opts.level ?? "info",
        timestamp: pino_1.default.stdTimeFunctions.isoTime,
        hooks: {
            logMethod(args, method) {
                const msg = args.find((a) => typeof a === "string");
                if (msg && msg.includes("Server listening at"))
                    return; // ⛔ drop this log
                return method.apply(this, args);
            },
        },
    }, stream);
    return { logger, files };
}
