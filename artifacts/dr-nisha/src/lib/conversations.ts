const API_BASE = "/api";

export interface ConvMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
}

export interface ConvData {
  id: string;
  title: string;
  pinned: boolean;
  createdAt: number;
  updatedAt: number;
  messages: ConvMessage[];
}

function authHeader(token: string) {
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

export async function fetchConversations(token: string): Promise<ConvData[]> {
  try {
    const r = await fetch(`${API_BASE}/conversations`, { headers: { Authorization: `Bearer ${token}` } });
    if (!r.ok) return [];
    const data = await r.json();
    return data.conversations ?? [];
  } catch { return []; }
}

export async function saveConversation(token: string, conv: ConvData): Promise<void> {
  try {
    await fetch(`${API_BASE}/conversations/${conv.id}`, {
      method: "PUT",
      headers: authHeader(token),
      body: JSON.stringify({
        title: conv.title,
        pinned: conv.pinned,
        messages: conv.messages,
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt,
      }),
    });
  } catch {}
}

export async function deleteConversation(token: string, id: string): Promise<void> {
  try {
    await fetch(`${API_BASE}/conversations/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {}
}

export async function pinConversation(token: string, id: string, pinned: boolean): Promise<void> {
  try {
    await fetch(`${API_BASE}/conversations/${id}/pin`, {
      method: "PATCH",
      headers: authHeader(token),
      body: JSON.stringify({ pinned }),
    });
  } catch {}
}
