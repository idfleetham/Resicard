import type { Request, Response, NextFunction, RequestHandler } from "express";
import type { ZodSchema, ZodTypeDef } from "zod";

/** An error carrying an HTTP status, rendered as { message } by the error handler. */
export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export const badRequest = (message: string) => new HttpError(400, message);
export const forbidden = (message = "Not allowed") => new HttpError(403, message);
export const notFound = (message = "Not found") => new HttpError(404, message);
export const conflict = (message: string) => new HttpError(409, message);

/** Wraps an async handler so rejections reach the Express error handler. */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}

/** Parses a body with a zod schema, throwing a 400 with the first issue's message. */
export function parseBody<Out, In = Out>(schema: ZodSchema<Out, ZodTypeDef, In>, body: unknown): Out {
  const result = schema.safeParse(body);
  if (!result.success) {
    const issue = result.error.issues[0];
    const path = issue.path.length ? `${issue.path.join(".")}: ` : "";
    throw badRequest(`${path}${issue.message}`);
  }
  return result.data;
}

/** Converts a numeric column value (string) to a number, or null. */
export function toNumber(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Converts a number to the string form drizzle expects for numeric columns. */
export function toNumericString(value: number | null | undefined): string | null {
  if (value === null || value === undefined || !Number.isFinite(value)) return null;
  return value.toFixed(2);
}
