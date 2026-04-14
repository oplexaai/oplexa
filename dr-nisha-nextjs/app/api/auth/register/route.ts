import { NextRequest } from "next/server";
import { findUserByEmail, createUser } from "@/lib/users";
import { signToken } from "@/lib/jwt";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, username, password } = body;

    if (!email || !username || !password) {
      return Response.json({ error: "Email, username aur password zaroori hain." }, { status: 400 });
    }
    if (password.length < 6) {
      return Response.json({ error: "Password kam se kam 6 characters ka hona chahiye." }, { status: 400 });
    }
    if (username.trim().length < 2) {
      return Response.json({ error: "Username kam se kam 2 characters ka hona chahiye." }, { status: 400 });
    }

    const existing = findUserByEmail(email);
    if (existing) {
      return Response.json({ error: "Yeh email pehle se registered hai. Login karo." }, { status: 409 });
    }

    const user = await createUser(email.trim(), username.trim(), password);
    const token = signToken({ userId: user.id, email: user.email, username: user.username });

    const res = Response.json({
      user: { id: user.id, email: user.email, username: user.username, createdAt: user.createdAt },
    });
    res.headers.set("Set-Cookie", `oplexa_token=${token}; HttpOnly; Path=/; Max-Age=${30 * 24 * 3600}; SameSite=Lax`);
    return res;
  } catch (err) {
    console.error("Register error:", err);
    return Response.json({ error: "Server error. Dobara try karo." }, { status: 500 });
  }
}
