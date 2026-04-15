"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DailyLogFiles = void 0;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
class DailyLogFiles {
    baseDir;
    currentDate = null;
    infoStream = null;
    errorStream = null;
    constructor(baseDir) {
        this.baseDir = baseDir;
    }
    getDateFolder(d = new Date()) {
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        return `${yyyy}-${mm}-${dd}`;
    }
    ensureStreams() {
        const today = this.getDateFolder(new Date());
        if (this.currentDate === today && this.infoStream && this.errorStream)
            return;
        this.close(); // close old streams
        this.currentDate = today;
        const dayDir = node_path_1.default.join(this.baseDir, today);
        node_fs_1.default.mkdirSync(dayDir, { recursive: true });
        this.infoStream = node_fs_1.default.createWriteStream(node_path_1.default.join(dayDir, "info.log"), { flags: "a" });
        this.errorStream = node_fs_1.default.createWriteStream(node_path_1.default.join(dayDir, "error.log"), { flags: "a" });
    }
    write(level, line) {
        this.ensureStreams();
        if (level === "error")
            this.errorStream.write(line + "\n");
        else
            this.infoStream.write(line + "\n");
    }
    close() {
        this.infoStream?.end();
        this.errorStream?.end();
        this.infoStream = null;
        this.errorStream = null;
    }
}
exports.DailyLogFiles = DailyLogFiles;
