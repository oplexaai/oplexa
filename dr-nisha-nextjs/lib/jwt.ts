import jwt from "jsonwebtoken";

const SECRET = process.env.SESSION_SECRET || "oplexa-default-secret-change-me";

export interface JWTPayload {
  userId: string;
  email: string;
  username: string;
}

export function signToken(payload: JWTPayload): string {
  return jwt.sign(payload, SECRET, { expiresIn: "30d" });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

export function getTokenFromRequest(request: Request): string | null {
  const cookie = request.headers.get("cookie") || "";
  const match = cookie.match(/oplexa_token=([^;]+)/);
  if (match) return match[1];
  const auth = request.headers.get("authorization") || "";
  if (auth.startsWith("Bearer ")) return auth.slice(7);
  return null;
}
