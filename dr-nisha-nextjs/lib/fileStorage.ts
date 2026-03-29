import * as fs from "fs";
import * as path from "path";

interface Conversation {
  id: number;
  title: string;
  created_at: string;
  updated_at: string;
}
interface Message {
  id: number;
  conversation_id: number;
  role: string;
  content: string;
  created_at: string;
}
interface StorageData {
  conversations: Conversation[];
  messages: Message[];
  nextConvId: number;
  nextMsgId: number;
}

const DATA_FILE = path.join(process.cwd(), ".nisha-data.json");

function read(): StorageData {
  try {
    if (fs.existsSync(DATA_FILE)) {
      return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
    }
  } catch {}
  return { conversations: [], messages: [], nextConvId: 1, nextMsgId: 1 };
}

function save(data: StorageData) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf8");
  } catch {}
}

export function fsGetConversations(): Conversation[] {
  const data = read();
  return [...data.conversations].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export function fsCreateConversation(title: string): Conversation {
  const data = read();
  const now = new Date().toISOString();
  const conv: Conversation = {
    id: data.nextConvId++,
    title: title || "New Consultation",
    created_at: now,
    updated_at: now,
  };
  data.conversations.push(conv);
  save(data);
  return conv;
}

export function fsGetConversation(id: number): (Conversation & { messages: Message[] }) | null {
  const data = read();
  const conv = data.conversations.find((c) => c.id === id);
  if (!conv) return null;
  const messages = data.messages.filter((m) => m.conversation_id === id);
  return { ...conv, messages };
}

export function fsAddMessage(conversationId: number, role: string, content: string): Message {
  const data = read();
  const now = new Date().toISOString();
  const msg: Message = {
    id: data.nextMsgId++,
    conversation_id: conversationId,
    role,
    content,
    created_at: now,
  };
  data.messages.push(msg);
  const conv = data.conversations.find((c) => c.id === conversationId);
  if (conv) conv.updated_at = now;
  save(data);
  return msg;
}

export function fsDeleteConversation(id: number) {
  const data = read();
  data.conversations = data.conversations.filter((c) => c.id !== id);
  data.messages = data.messages.filter((m) => m.conversation_id !== id);
  save(data);
}

export function fsGetMessages(conversationId: number): Message[] {
  return read().messages.filter((m) => m.conversation_id === conversationId);
}
