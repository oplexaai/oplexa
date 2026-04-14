import { Platform } from "react-native";

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

function getApiBase(): string {
  const explicitUrl = process.env.EXPO_PUBLIC_API_URL;
  if (explicitUrl) return explicitUrl.replace(/\/$/, "");
  if (Platform.OS === "web") return "";
  const domain = process.env.EXPO_PUBLIC_DOMAIN || "";
  if (!domain) return "";
  return `https://${domain}/api-server`;
}

function apiUrl(path: string): string {
  const base = getApiBase();
  return Platform.OS === "web" ? `/api${path}` : `${base}/api${path}`;
}

function authHeader(token: string) {
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

export async function fetchConversations(token: string): Promise<ConvData[]> {
  try {
    const r = await fetch(apiUrl("/conversations"), { headers: { Authorization: `Bearer ${token}` } });
    if (!r.ok) return [];
    const data = await r.json();
    return data.conversations ?? [];
  } catch { return []; }
}

export async function saveConversation(token: string, conv: ConvData): Promise<void> {
  try {
    await fetch(apiUrl(`/conversations/${conv.id}`), {
      method: "PUT",
      headers: authHeader(token),
      body: JSON.stringify(conv),
    });
  } catch {}
}

export async function deleteConversationApi(token: string, id: string): Promise<void> {
  try {
    await fetch(apiUrl(`/conversations/${id}`), {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {}
}

export async function pinConversationApi(token: string, id: string, pinned: boolean): Promise<void> {
  try {
    await fetch(apiUrl(`/conversations/${id}/pin`), {
      method: "PATCH",
      headers: authHeader(token),
      body: JSON.stringify({ pinned }),
    });
  } catch {}
}
