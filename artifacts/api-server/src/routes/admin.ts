import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { eq, desc, sql } from "drizzle-orm";
import { db, users, aiConfig } from "@workspace/db";

const router = Router();
const JWT_SECRET = process.env.SESSION_SECRET || "oplexa-dev-secret-change-in-prod";

async function adminAuth(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) { res.status(401).json({ error: "No token" }); return; }
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: number };
    const [user] = await db.select().from(users).where(eq(users.id, payload.userId)).limit(1);
    if (!user || !user.isAdmin) { res.status(403).json({ error: "Admin access required" }); return; }
    req.adminUser = user;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

router.get("/admin/users", adminAuth, async (req, res) => {
  try {
    const allUsers = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        phone: users.phone,
        bio: users.bio,
        avatarUrl: users.avatarUrl,
        isAdmin: users.isAdmin,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt));
    res.json({ users: allUsers });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/admin/stats", adminAuth, async (req, res) => {
  try {
    const [{ total }] = await db.select({ total: sql<number>`count(*)::int` }).from(users);
    const [{ admins }] = await db.select({ admins: sql<number>`count(*)::int` }).from(users).where(eq(users.isAdmin, true));
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [{ newToday }] = await db.select({ newToday: sql<number>`count(*)::int` }).from(users).where(sql`${users.createdAt} >= ${today}`);
    res.json({ total, admins, newToday });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/admin/users/:id", adminAuth, async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid user ID" }); return; }
  const { name, email, phone, bio, avatarUrl, password, isAdmin: isAdminFlag } = req.body;
  const updates: any = { updatedAt: new Date() };
  if (name !== undefined && name.trim()) updates.name = name.trim();
  if (email !== undefined && email.trim()) updates.email = email.toLowerCase().trim();
  if (phone !== undefined) updates.phone = phone || null;
  if (bio !== undefined) updates.bio = bio || null;
  if (avatarUrl !== undefined) updates.avatarUrl = avatarUrl || null;
  if (isAdminFlag !== undefined) updates.isAdmin = Boolean(isAdminFlag);
  if (password && password.length >= 6) updates.passwordHash = await bcrypt.hash(password, 12);
  try {
    const [user] = await db.update(users).set(updates).where(eq(users.id, id)).returning();
    if (!user) { res.status(404).json({ error: "User not found" }); return; }
    const { passwordHash: _, ...safeUser } = user;
    res.json({ user: safeUser });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/admin/users/:id", adminAuth, async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid user ID" }); return; }
  const adminId = (req as any).adminUser.id;
  if (id === adminId) { res.status(400).json({ error: "Apne aap ko delete nahi kar sakte" }); return; }
  try {
    await db.delete(users).where(eq(users.id, id));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/admin/ai-config", adminAuth, async (req, res) => {
  try {
    const [config] = await db.select().from(aiConfig).limit(1);
    res.json({ config: config || { id: null, systemPrompt: "", personality: "", restrictions: "" } });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/admin/ai-config", adminAuth, async (req, res) => {
  const { systemPrompt, personality, restrictions } = req.body;
  try {
    const [existing] = await db.select().from(aiConfig).limit(1);
    if (existing) {
      const [updated] = await db
        .update(aiConfig)
        .set({
          systemPrompt: systemPrompt ?? existing.systemPrompt,
          personality: personality ?? existing.personality,
          restrictions: restrictions ?? existing.restrictions,
          updatedAt: new Date(),
        })
        .where(eq(aiConfig.id, existing.id))
        .returning();
      res.json({ config: updated });
    } else {
      const [created] = await db
        .insert(aiConfig)
        .values({ systemPrompt: systemPrompt || "", personality: personality || "", restrictions: restrictions || "" })
        .returning();
      res.json({ config: created });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
