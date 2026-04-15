"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UploadError = void 0;
exports.uploadSingleFile = uploadSingleFile;
exports.uploadMultipleFiles = uploadMultipleFiles;
exports.deleteFile = deleteFile;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const promises_1 = require("stream/promises");
const stream_1 = require("stream");
const DEFAULT_MIMES = ["image/jpeg", "image/png", "image/webp"];
const DEFAULT_MAX_SIZE = 5 * 1024 * 1024; // 5MB
/**
 * Upload a single file from a multipart request.
 * Stores in: {process.cwd()}/public/{subDir}/{prefix}_{timestamp}{ext}
 * Returns full path and serving URL.
 */
async function uploadSingleFile(req, options) {
    const { subDir, allowedMimes = DEFAULT_MIMES, maxSize = DEFAULT_MAX_SIZE, prefix = "file", } = options;
    const file = await req.file();
    if (!file) {
        throw new UploadError("No file uploaded", 400);
    }
    if (!allowedMimes.includes(file.mimetype)) {
        file.file.resume();
        throw new UploadError(`Invalid file type: ${file.mimetype}. Allowed: ${allowedMimes.join(", ")}`, 400);
    }
    const uploadDir = path_1.default.join(process.cwd(), "public", subDir);
    fs_1.default.mkdirSync(uploadDir, { recursive: true });
    const ext = path_1.default.extname(file.filename) || ".jpg";
    const fileName = `${prefix}_${Date.now()}${ext}`;
    const fullPath = path_1.default.join(uploadDir, fileName);
    const url = `${process.env.BASE_URL}/public/${subDir}/${fileName}`;
    const writeStream = fs_1.default.createWriteStream(fullPath);
    let size = 0;
    const sizeCheck = new stream_1.Transform({
        transform(chunk, _encoding, callback) {
            size += chunk.length;
            if (size > maxSize) {
                callback(new Error(`File too large. Maximum ${Math.round(maxSize / 1024 / 1024)}MB allowed`));
                return;
            }
            callback(null, chunk);
        },
    });
    try {
        await (0, promises_1.pipeline)(file.file, sizeCheck, writeStream);
    }
    catch (err) {
        if (fs_1.default.existsSync(fullPath))
            fs_1.default.unlinkSync(fullPath);
        throw new UploadError(err.message || "File upload failed", 400);
    }
    return {
        fullPath,
        url,
        originalName: file.filename,
        mimetype: file.mimetype,
        size,
    };
}
/**
 * Upload multiple files from a multipart request.
 * Returns array of uploaded files + any parsed fields.
 */
async function uploadMultipleFiles(req, options) {
    const { subDir, allowedMimes = DEFAULT_MIMES, maxSize = DEFAULT_MAX_SIZE, maxFiles = 10, prefix = "file", } = options;
    const uploadDir = path_1.default.join(process.cwd(), "public", subDir);
    fs_1.default.mkdirSync(uploadDir, { recursive: true });
    const parts = req.parts();
    const fields = {};
    const uploadedFiles = [];
    let fileCount = 0;
    for await (const part of parts) {
        if (part.type === "field") {
            fields[part.fieldname] = String(part.value);
            continue;
        }
        if (part.type === "file") {
            fileCount++;
            if (fileCount > maxFiles) {
                part.file.resume();
                continue;
            }
            if (!allowedMimes.includes(part.mimetype)) {
                part.file.resume();
                throw new UploadError(`Invalid file type: ${part.mimetype}. Allowed: ${allowedMimes.join(", ")}`, 400);
            }
            const ext = path_1.default.extname(part.filename) || ".jpg";
            const fileName = `${prefix}_${Date.now()}_${fileCount}${ext}`;
            const fullPath = path_1.default.join(uploadDir, fileName);
            const url = `/public/${subDir}/${fileName}`;
            const writeStream = fs_1.default.createWriteStream(fullPath);
            let size = 0;
            const sizeCheck = new stream_1.Transform({
                transform(chunk, _encoding, callback) {
                    size += chunk.length;
                    if (size > maxSize) {
                        callback(new Error(`File too large. Maximum ${Math.round(maxSize / 1024 / 1024)}MB allowed`));
                        return;
                    }
                    callback(null, chunk);
                },
            });
            try {
                await (0, promises_1.pipeline)(part.file, sizeCheck, writeStream);
            }
            catch (err) {
                if (fs_1.default.existsSync(fullPath))
                    fs_1.default.unlinkSync(fullPath);
                throw new UploadError(err.message || "File upload failed", 400);
            }
            uploadedFiles.push({
                fullPath,
                url,
                originalName: part.filename,
                mimetype: part.mimetype,
                size,
            });
        }
    }
    if (fileCount > maxFiles) {
        throw new UploadError(`Maximum ${maxFiles} files allowed`, 400);
    }
    return { files: uploadedFiles, fields };
}
/**
 * Delete a file by its full path or URL.
 */
function deleteFile(filePathOrUrl) {
    let fullPath = filePathOrUrl;
    if (filePathOrUrl.startsWith("/public/")) {
        fullPath = path_1.default.join(process.cwd(), filePathOrUrl);
    }
    if (fs_1.default.existsSync(fullPath)) {
        fs_1.default.unlinkSync(fullPath);
    }
}
class UploadError extends Error {
    statusCode;
    constructor(message, statusCode = 400) {
        super(message);
        this.name = "UploadError";
        this.statusCode = statusCode;
    }
}
exports.UploadError = UploadError;
