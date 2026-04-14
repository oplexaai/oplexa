import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";
import { db, users } from "@workspace/db";

const router = Router();

const JWT_SECRET = process.env.SESSION_SECRET || "oplexa-dev-secret-change-in-prod";
const JWT_EXPIRES = "30d";

function makeToken(userId: number) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

function verifyToken(token: string): { userId: number } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: number };
  } catch {
    return null;
  }
}

function toPublic(u: typeof users.$inferSelect) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone ?? undefined,
    bio: u.bio ?? undefined,
    avatarUrl: u.avatarUrl ?? undefined,
    createdAt: u.createdAt.getTime(),
  };
}

router.post("/auth/register", async (req, res) => {
  const { name, email, password } = req.body;
  if (!name?.trim() || !email?.trim() || !password) {
    res.status(400).json({ error: "Name, email and password required" });
    return;
  }
  if (password.length < 6) {
    res.status(400).json({ error: "Password must be at least 6 characters" });
    return;
  }

  try {
    const existing = await db.select().from(users).where(eq(users.email, email.toLowerCase().trim())).limit(1);
    if (existing.length > 0) {
      res.status(409).json({ error: "Email already registered" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const [user] = await db.insert(users).values({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
    }).returning();

    const token = makeToken(user.id);
    res.status(201).json({ token, user: toPublic(user) });
  } catch (err: any) {
    res.status(500).json({ error: "Registration failed: " + err.message });
  }
});

router.post("/auth/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email?.trim() || !password) {
    res.status(400).json({ error: "Email and password required" });
    return;
  }

  try {
    const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase().trim())).limit(1);
    if (!user) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const token = makeToken(user.id);
    res.json({ token, user: toPublic(user) });
  } catch (err: any) {
    res.status(500).json({ error: "Login failed: " + err.message });
  }
});

router.get("/auth/me", async (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    res.status(401).json({ error: "No token" });
    return;
  }

  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }

  try {
    const [user] = await db.select().from(users).where(eq(users.id, payload.userId)).limit(1);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json({ user: toPublic(user) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/auth/profile", async (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) { res.status(401).json({ error: "No token" }); return; }

  const payload = verifyToken(token);
  if (!payload) { res.status(401).json({ error: "Invalid token" }); return; }

  const { name, phone, bio, avatarUrl } = req.body;
  const updates: Partial<typeof users.$inferInsert> = { updatedAt: new Date() };
  if (name !== undefined) {
    if (!name.trim()) { res.status(400).json({ error: "Name cannot be empty" }); return; }
    updates.name = name.trim();
  }
  if (phone !== undefined) updates.phone = phone || null;
  if (bio !== undefined) updates.bio = bio || null;
  if (avatarUrl !== undefined) updates.avatarUrl = avatarUrl || null;

  try {
    const [user] = await db.update(users).set(updates).where(eq(users.id, payload.userId)).returning();
    if (!user) { res.status(404).json({ error: "User not found" }); return; }
    res.json({ user: toPublic(user) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/auth/change-password", async (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) { res.status(401).json({ error: "No token" }); return; }

  const payload = verifyToken(token);
  if (!payload) { res.status(401).json({ error: "Invalid token" }); return; }

  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) { res.status(400).json({ error: "Both fields required" }); return; }
  if (newPassword.length < 6) { res.status(400).json({ error: "Minimum 6 characters" }); return; }

  try {
    const [user] = await db.select().from(users).where(eq(users.id, payload.userId)).limit(1);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) { res.status(401).json({ error: "Current password is incorrect" }); return; }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await db.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, payload.userId));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
