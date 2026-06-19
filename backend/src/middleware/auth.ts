import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

import { env } from "../config/env.js";

export type AuthenticatedRequest = Request & {
  user?: { id: string; email?: string };
};

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const token = req.header("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) {
    return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Missing bearer token." } });
  }

  try {
    req.user = jwt.verify(token, env.JWT_SECRET) as { id: string; email?: string };
    return next();
  } catch {
    return resolveSupabaseUser(token, req, res, next);
  }
}

async function resolveSupabaseUser(token: string, req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Invalid bearer token." } });
  }

  try {
    const response = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
        Accept: "application/json"
      }
    });

    if (!response.ok) {
      return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Invalid bearer token." } });
    }

    const user = (await response.json()) as { id: string; email?: string };
    req.user = { id: user.id, email: user.email };
    return next();
  } catch {
    return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Invalid bearer token." } });
  }
}
