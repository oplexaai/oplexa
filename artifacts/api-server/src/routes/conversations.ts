import { Router } from "express";
import { eq, and, desc } from "drizzle-orm";
import jwt from "jsonwebtoken";
import { db } from "@workspace/db";
import { conversations, messages } from "@workspace/db/schema";

const router = Router();

const JWT_SECRET = process.env.SESSION_SECRET || "oplexa-dev-secret-change-in-prod";

function getUser(req: any): number | null {
  const auth = req.headers.authorization;
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return null;
  try {
    const p = jwt.verify(token, JWT_SECRET) as { userId: number };
    return p.userId;
  } catch {
    return null;
  }
}

router.get("/conversations", async (req, res) => {
  const userId = getUser(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  try {
    const convs = await db
      .select()
      .from(conversations)
      .where(eq(conversations.userId, userId))
      .orderBy(desc(conversations.updatedAt));

    const result = await Promise.all(
      convs.map(async (conv) => {
        const msgs = await db
          .select()
          .from(messages)
          .where(eq(messages.conversationId, conv.id))
          .orderBy(messages.createdAt);
        return {
          id: conv.id,
          title: conv.title,
          pinned: conv.pinned,
          createdAt: conv.createdAt.getTime(),
          updatedAt: conv.updatedAt.getTime(),
          messages: msgs.map(m => ({
            id: String(m.id),
            role: m.role,
            content: m.content,
            createdAt: m.createdAt.getTime(),
          })),
        };
      })
    );

    res.json({ conversations: result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/conversations/:id", async (req, res) => {
  const userId = getUser(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const convId = req.params.id;
  const { title, pinned, messages: msgs, createdAt, updatedAt } = req.body as {
    title: string;
    pinned?: boolean;
    messages: Array<{ role: string; content: string; createdAt?: number }>;
    createdAt?: number;
    updatedAt?: number;
  };

  if (!title || !Array.isArray(msgs)) {
    res.status(400).json({ error: "title and messages required" });
    return;
  }

  try {
    const existing = await db
      .select({ id: conversations.id })
      .from(conversations)
      .where(and(eq(conversations.id, convId), eq(conversations.userId, userId)))
      .limit(1);

    const now = new Date();

    if (existing.length > 0) {
      await db.update(conversations)
        .set({
          title,
          pinned: pinned ?? false,
          updatedAt: updatedAt ? new Date(updatedAt) : now,
        })
        .where(and(eq(conversations.id, convId), eq(conversations.userId, userId)));

      await db.delete(messages).where(eq(messages.conversationId, convId));
    } else {
      await db.insert(conversations).values({
        id: convId,
        userId,
        title,
        pinned: pinned ?? false,
        createdAt: createdAt ? new Date(createdAt) : now,
        updatedAt: updatedAt ? new Date(updatedAt) : now,
      });
    }

    if (msgs.length > 0) {
      await db.insert(messages).values(
        msgs.map(m => ({
          conversationId: convId,
          role: m.role,
          content: m.content,
          createdAt: m.createdAt ? new Date(m.createdAt) : now,
        }))
      );
    }

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/conversations/:id", async (req, res) => {
  const userId = getUser(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  try {
    await db.delete(conversations)
      .where(and(eq(conversations.id, req.params.id), eq(conversations.userId, userId)));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/conversations/:id/pin", async (req, res) => {
  const userId = getUser(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const { pinned } = req.body;
  try {
    await db.update(conversations)
      .set({ pinned: !!pinned })
      .where(and(eq(conversations.id, req.params.id), eq(conversations.userId, userId)));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
