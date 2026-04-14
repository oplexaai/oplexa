import { NextRequest } from "next/server";
import { getTokenFromRequest, verifyToken } from "@/lib/jwt";
import { findUserById } from "@/lib/users";

export async function GET(request: NextRequest) {
  const token = getTokenFromRequest(request);
  if (!token) return Response.json({ user: null }, { status: 401 });

  const payload = verifyToken(token);
  if (!payload) return Response.json({ user: null }, { status: 401 });

  const user = findUserById(payload.userId);
  if (!user) return Response.json({ user: null }, { status: 401 });

  return Response.json({
    user: { id: user.id, email: user.email, username: user.username, createdAt: user.createdAt },
  });
}
