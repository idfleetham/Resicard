import multer from "multer";
import type { Express, Request, Response, NextFunction } from "express";
import { badRequest } from "./http";

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

/** Image-only multipart upload held in memory; the route stores it as a data URL. */
export const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(badRequest("Only image files are accepted"));
    }
  },
});

export function fileToDataUrl(file: Express.Multer.File): string {
  return `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
}

/** Turns multer's own errors (size limit, unexpected field) into 400 responses. */
export function uploadErrorHandler(err: unknown, _req: Request, res: Response, next: NextFunction): void {
  if (err instanceof multer.MulterError) {
    const message = err.code === "LIMIT_FILE_SIZE" ? "File is larger than 5 MB" : err.message;
    res.status(400).json({ message });
    return;
  }
  next(err);
}

/** Splits a data URL into its MIME type and bytes. */
export function dataUrlToBuffer(dataUrl: string): { mimeType: string; buffer: Buffer } | null {
  const match = /^data:([^;,]+)(;base64)?,([\s\S]*)$/.exec(dataUrl);
  if (!match) return null;
  const [, mimeType, isBase64, payload] = match;
  const buffer = isBase64 ? Buffer.from(payload, "base64") : Buffer.from(decodeURIComponent(payload), "utf8");
  return { mimeType, buffer };
}
