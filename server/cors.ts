import type { NextFunction, Request, Response } from "express";

export function getAllowedOrigin(value: string | undefined) {
  if (!value || value === "*") return undefined;

  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return undefined;
    return url.origin;
  } catch {
    return undefined;
  }
}

export function applyAllowedOrigin(req: Request, res: Response, next: NextFunction) {
  const allowedOrigin = getAllowedOrigin(process.env.ALLOWED_ORIGIN);
  const requestOrigin = req.header("Origin");

  if (!allowedOrigin || !requestOrigin || requestOrigin !== allowedOrigin) {
    next();
    return;
  }

  res.header("Access-Control-Allow-Origin", allowedOrigin);
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  next();
}
