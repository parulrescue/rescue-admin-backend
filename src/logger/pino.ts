import pino, { type Logger } from "pino";
import { DailyLogFiles } from "./daily-files";
import fs from "fs";
import path from "path";

type SplitStreamOptions = {
    baseDir: string; // e.g. "logs/local"
    level?: string;  // e.g. "info"
};

export function createFileLogger(opts: SplitStreamOptions): { logger: Logger; files: DailyLogFiles } {
    const files = new DailyLogFiles(opts.baseDir);
    const baseDir = path.resolve(opts.baseDir); // absolute
    fs.mkdirSync(baseDir, { recursive: true });

    const stream = {
        write(chunk: string) {
            const line = chunk.endsWith("\n") ? chunk.slice(0, -1) : chunk;

            // pino writes JSON per line -> we route by numeric level
            try {
                const obj = JSON.parse(line);
                const lvl = typeof obj.level === "number" ? obj.level : 30; // default info
                files.write(lvl >= 50 ? "error" : "info", line); // 50=error, 60=fatal
            } catch {
                // if not JSON, still write somewhere
                files.write("info", line);
            }
        },
    };

    const logger = pino(
        {
            level: opts.level ?? "info",
            timestamp: pino.stdTimeFunctions.isoTime,

            hooks: {
                logMethod(args, method) {
                    const msg = args.find((a) => typeof a === "string");
                    if (msg && msg.includes("Server listening at")) return; // ⛔ drop this log
                    return method.apply(this, args as any);
                },
            },
        },
        stream as any
    );

    return { logger, files };
}