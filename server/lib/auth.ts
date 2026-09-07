import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction, RequestHandler } from "express";
import type { UserRole, User, PublicUser } from "@shared/schema";
import { config } from "../config";

export interface AuthUser {
  id: number;
  username: string;
  role: UserRole;
  merchantId: string | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

const TOKEN_TTL = "7d";

export function signToken(user: { id: number; username: string; role: UserRole; merchantId?: string | null }): string {
  const payload: AuthUser = {
    id: user.id,
    username: user.username,
    role: user.role,
    merchantId: user.merchantId ?? null,
  };
  return jwt.sign(payload, config.jwtSecret, { expiresIn: TOKEN_TTL });
}

function isAuthUser(value: unknown): value is AuthUser {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return typeof v.id === "number" && typeof v.username === "string" && typeof v.role === "string";
}

/** Reads the Bearer token and sets req.user, or responds 401. */
export const authenticate: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7).trim() : null;
  if (!token) {
    res.status(401).json({ message: "Authentication required" });
    return;
  }
  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    if (!isAuthUser(decoded)) {
      res.status(401).json({ message: "Invalid token" });
      return;
    }
    req.user = {
      id: decoded.id,
      username: decoded.username,
      role: decoded.role,
      merchantId: decoded.merchantId ?? null,
    };
    next();
  } catch {
    res.status(401).json({ message: "Invalid or expired token" });
  }
};

/** Requires req.user to have one of the given roles. Use after authenticate. */
export function requireRole(...roles: UserRole[]): RequestHandler {
  return (req, res, next) => {
    if (!req.user) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ message: "Not allowed" });
      return;
    }
    next();
  };
}

/** Returns the caller (already checked by authenticate). */
export function currentUser(req: Request): AuthUser {
  if (!req.user) throw Object.assign(new Error("Authentication required"), { status: 401 });
  return req.user;
}

/** Merchant routes resolve the merchant from the token only. */
export function currentMerchantId(req: Request): string {
  const user = currentUser(req);
  if (!user.merchantId) throw Object.assign(new Error("No merchant linked to this account"), { status: 403 });
  return user.merchantId;
}

export function toPublicUser(user: User): PublicUser {
  const { password: _password, documentFile: _documentFile, ...rest } = user;
  return rest;
}
