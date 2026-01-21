import type { Request, Response, NextFunction } from "express";

export interface ApiError extends Error {
  statusCode?: number;
  details?: unknown;
}

/**
 * Global error handler middleware
 * Catches all errors and returns a consistent JSON response
 */
export function errorHandler(
  err: ApiError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  console.error(`[Error] ${statusCode}: ${message}`, err.details || "");

  res.status(statusCode).json({
    error: {
      message,
      statusCode,
      ...(process.env.NODE_ENV !== "production" && err.details
        ? { details: err.details }
        : {}),
    },
  });
}

/**
 * Helper to create API errors with status codes
 */
export function createError(
  message: string,
  statusCode: number = 500,
  details?: unknown
): ApiError {
  const error = new Error(message) as ApiError;
  error.statusCode = statusCode;
  error.details = details;
  return error;
}
