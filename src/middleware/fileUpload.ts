import { FastifyRequest } from "fastify";
import path from "path";
import fs from "fs";
import { pipeline } from "stream/promises";
import { Transform } from "stream";
import { config } from "../config";

export interface UploadOptions {
  /** Subdirectory inside public/ (e.g. "profile_pic", "rescues") */
  subDir: string;
  /** Allowed MIME types */
  allowedMimes?: string[];
  /** Max file size in bytes (default 5MB) */
  maxSize?: number;
  /** Max number of files (default 1) */
  maxFiles?: number;
  /** File name prefix (default "file") */
  prefix?: string;
}

export interface UploadedFile {
  /** Full absolute path on disk */
  fullPath: string;
  /** Relative path stored in DB (e.g. profile_pic/avatar_1_123456.jpg). Serve via /api/file/{url}. */
  url: string;
  /** Original filename from client */
  originalName: string;
  /** MIME type */
  mimetype: string;
  /** File size in bytes */
  size: number;
}

const DEFAULT_MIMES = ["image/jpeg", "image/png", "image/webp"];
const DEFAULT_MAX_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * Upload a single file from a multipart request.
 * Stores in: {process.cwd()}/public/{subDir}/{prefix}_{timestamp}{ext}
 * Returns full path and serving URL.
 */
export async function uploadSingleFile(
  req: FastifyRequest,
  options: UploadOptions
): Promise<UploadedFile> {
  const {
    subDir,
    allowedMimes = DEFAULT_MIMES,
    maxSize = DEFAULT_MAX_SIZE,
    prefix = "file",
  } = options;

  const file = await (req as any).file();
  if (!file) {
    throw new UploadError("No file uploaded", 400);
  }

  if (!allowedMimes.includes(file.mimetype)) {
    file.file.resume();
    throw new UploadError(
      `Invalid file type: ${file.mimetype}. Allowed: ${allowedMimes.join(", ")}`,
      400
    );
  }

  const uploadDir = path.join(process.cwd(), "public", subDir);
  fs.mkdirSync(uploadDir, { recursive: true });

  const ext = path.extname(file.filename) || ".jpg";
  const fileName = `${prefix}_${Date.now()}${ext}`;
  const fullPath = path.join(uploadDir, fileName);
  const url = `${subDir}/${fileName}`;

  const writeStream = fs.createWriteStream(fullPath);
  let size = 0;

  const sizeCheck = new Transform({
    transform(chunk: Buffer, _encoding: string, callback: Function) {
      size += chunk.length;
      if (size > maxSize) {
        callback(new Error(`File too large. Maximum ${Math.round(maxSize / 1024 / 1024)}MB allowed`));
        return;
      }
      callback(null, chunk);
    },
  });

  try {
    await pipeline(file.file, sizeCheck, writeStream);
  } catch (err: any) {
    if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
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
export async function uploadMultipleFiles(
  req: FastifyRequest,
  options: UploadOptions
): Promise<{ files: UploadedFile[]; fields: Record<string, string> }> {
  const {
    subDir,
    allowedMimes = DEFAULT_MIMES,
    maxSize = DEFAULT_MAX_SIZE,
    maxFiles = 10,
    prefix = "file",
  } = options;

  const uploadDir = path.join(process.cwd(), "public", subDir);
  fs.mkdirSync(uploadDir, { recursive: true });

  const parts = (req as any).parts();
  const fields: Record<string, string> = {};
  const uploadedFiles: UploadedFile[] = [];
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
        throw new UploadError(
          `Invalid file type: ${part.mimetype}. Allowed: ${allowedMimes.join(", ")}`,
          400
        );
      }

      const ext = path.extname(part.filename) || ".jpg";
      const fileName = `${prefix}_${Date.now()}_${fileCount}${ext}`;
      const fullPath = path.join(uploadDir, fileName);
      const url = `${config.upload.fileAccessUrl}/api/file/${subDir}/${fileName}`;

      const writeStream = fs.createWriteStream(fullPath);
      let size = 0;

      const sizeCheck = new Transform({
        transform(chunk: Buffer, _encoding: string, callback: Function) {
          size += chunk.length;
          if (size > maxSize) {
            callback(new Error(`File too large. Maximum ${Math.round(maxSize / 1024 / 1024)}MB allowed`));
            return;
          }
          callback(null, chunk);
        },
      });

      try {
        await pipeline(part.file, sizeCheck, writeStream);
      } catch (err: any) {
        if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
        throw new UploadError(err.message || "File upload failed", 400);
      }

      console.log(url, 'url------->')

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
 * Delete a file by its stored DB value (relative path), legacy /public/ URL, or absolute path.
 */
export function deleteFile(filePathOrUrl: string): void {
  if (!filePathOrUrl) return;

  let fullPath = filePathOrUrl;

  // Strip protocol+host if a full URL was stored historically
  const httpMatch = filePathOrUrl.match(/^https?:\/\/[^/]+(\/.*)$/);
  if (httpMatch && httpMatch[1]) {
    fullPath = httpMatch[1];
  }

  // Legacy: "/public/sub/file.jpg" or "/api/file/sub/file.jpg"
  if (fullPath.startsWith("/public/")) {
    fullPath = path.join(process.cwd(), fullPath);
  } else if (fullPath.startsWith("/api/file/")) {
    fullPath = path.join(process.cwd(), "public", fullPath.slice("/api/file/".length));
  } else if (!path.isAbsolute(fullPath)) {
    // New format: "sub/file.jpg"
    fullPath = path.join(process.cwd(), "public", fullPath);
  }

  if (fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
  }
}

export class UploadError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number = 400) {
    super(message);
    this.name = "UploadError";
    this.statusCode = statusCode;
  }
}
