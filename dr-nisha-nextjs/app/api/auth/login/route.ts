import { NextRequest } from "next/server";
import { findUserByEmail, verifyPassword } from "@/lib/users";
import { signToken } from "@/lib/jwt";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return Response.json({ error: "Email aur password daalo." }, { status: 400 });
    }

    const user = findUserByEmail(email);
    if (!user) {
      return Response.json({ error: "Email ya password galat hai." }, { status: 401 });
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return Response.json({ error: "Email ya password galat hai." }, { status: 401 });
    }

    const token = signToken({ userId: user.id, email: user.email, username: user.username });

    const res = Response.json({
      user: { id: user.id, email: user.email, username: user.username, createdAt: user.createdAt },
    });
    res.headers.set("Set-Cookie", `oplexa_token=${token}; HttpOnly; Path=/; Max-Age=${30 * 24 * 3600}; SameSite=Lax`);
    return res;
  } catch (err) {
    console.error("Login error:", err);
    return Response.json({ error: "Server error. Dobara try karo." }, { status: 500 });
  }
}
