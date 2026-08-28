import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "./authMiddleware";

/**
 * Middleware that extracts and normalizes the idempotency key from headers or body
 */
export function extractIdempotencyKey(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const headerKey = req.headers["idempotency-key"] || req.headers["x-idempotency-key"];
  if (headerKey && typeof headerKey === "string") {
    (req as any).idempotencyKey = headerKey.trim();
  } else if (req.body && req.body.idempotencyKey && typeof req.body.idempotencyKey === "string") {
    (req as any).idempotencyKey = req.body.idempotencyKey.trim();
  }
  next();
}
