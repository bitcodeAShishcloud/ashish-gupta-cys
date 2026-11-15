/* Device-token identity + conversation CRUD against Turso, via the app's
 * same-origin API routes. Falls back to localStorage when offline/unavailable.
 *
 * The device token IS the user identity — no password, no email. Stored
 * only in the visitor's localStorage. Clearing browser data = new identity
 * (unless the recovery code is used).
 */

const DEVICE_TOKEN_KEY = "device_token_v1";
const DEVICE_NAME_KEY = "device_name_v1";
const RECOVERY_KEY = "recovery_code_v1";

export interface ConversationSummary {
  id: string;
  title: string;
  mode: "chat" | "image" | "video";
  pinned: boolean;
  createdAt: number;
  updatedAt: number;
  messageCount: number;
}

export interface ConversationMessage {
  id: number;
  role: "user" | "assistant";
  content: string;
  kind: "text" | "image" | "video";
  mail: boolean;
  sources?: { title: string; url: string }[];
  createdAt: number;
}

export interface ConversationDetail {
  conversation: {
    id: string;
    title: string;
    mode: "chat" | "image" | "video";
    pinned: boolean;
    createdAt: number;
    updatedAt: number;
  };
  messages: ConversationMessage[];
}

function genToken(): string {
  return crypto.randomUUID();
}

function genRecoveryCode(): string {
  // 16-char human-readable code: XXXX-XXXX-XXXX-XXXX
  // crypto.getRandomValues (CSPRNG) — Math.random is predictable and this
  // code is credential-grade if the recovery flow gets wired.
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const buf = new Uint32Array(16);
  crypto.getRandomValues(buf);
  let out = "";
  for (let i = 0; i < 16; i++) {
    if (i > 0 && i % 4 === 0) out += "-";
    out += chars[buf[i] % chars.length];
  }
  return out;
}

export function getDeviceToken(): string {
  if (typeof window === "undefined") return "";
  let token = localStorage.getItem(DEVICE_TOKEN_KEY);
  if (!token) {
    token = genToken();
    localStorage.setItem(DEVICE_TOKEN_KEY, token);
    localStorage.setItem(RECOVERY_KEY, genRecoveryCode());
  }
  return token;
}

export function getRecoveryCode(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(RECOVERY_KEY) ?? "";
}

export function setRecoveryCode(code: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(RECOVERY_KEY, code);
}

export function getDeviceName(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(DEVICE_NAME_KEY) ?? "";
}

export function setDeviceName(name: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(DEVICE_NAME_KEY, name);
}

export async function initDevice(token: string, deviceName: string): Promise<void> {
  try {
    const res = await fetch("/api/device/init", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Device-Token": token },
      body: JSON.stringify({ token, deviceName }),
    });
    if (!res.ok) {
      // DB not configured or unavailable — silently fall back to localStorage
      return;
    }
  } catch {
    /* offline — ignore */
  }
}

export async function fetchConversations(token: string): Promise<ConversationSummary[]> {
  try {
    const res = await fetch("/api/conversations", {
      headers: { "X-Device-Token": token },
    });
    if (!res.ok) throw new Error("fetch failed");
    const data = await res.json();
    return data.conversations ?? [];
  } catch {
    return []; // offline fallback — caller uses localStorage
  }
}

export async function createConversation(
  token: string,
  id: string,
  title: string,
  mode: string,
): Promise<{ id: string; title: string } | null> {
  try {
    const res = await fetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Device-Token": token },
      body: JSON.stringify({ id, title, mode }),
    });
    if (!res.ok) throw new Error("create failed");
    return await res.json();
  } catch {
    return null;
  }
}

export async function fetchConversation(
  token: string,
  id: string,
): Promise<ConversationDetail | null> {
  try {
    const res = await fetch(`/api/conversations/${id}`, {
      headers: { "X-Device-Token": token },
    });
    if (!res.ok) throw new Error("fetch failed");
    return await res.json();
  } catch {
    return null;
  }
}

export async function updateConversation(
  token: string,
  id: string,
  patch: { title?: string; pinned?: boolean; mode?: string },
): Promise<boolean> {
  try {
    const res = await fetch(`/api/conversations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "X-Device-Token": token },
      body: JSON.stringify(patch),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function deleteConversation(token: string, id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/conversations/${id}`, {
      method: "DELETE",
      headers: { "X-Device-Token": token },
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function searchConversations(
  token: string,
  query: string,
): Promise<ConversationSummary[]> {
  if (!query.trim()) return fetchConversations(token);
  try {
    const res = await fetch(`/api/conversations/search?q=${encodeURIComponent(query)}`, {
      headers: { "X-Device-Token": token },
    });
    if (!res.ok) throw new Error("search failed");
    const data = await res.json();
    return data.conversations ?? [];
  } catch {
    return [];
  }
}

export async function saveMessage(
  token: string,
  conversationId: string,
  msg: { role: string; content: string; kind?: string; mail?: boolean; sources?: { title: string; url: string }[] },
): Promise<number | null> {
  try {
    const res = await fetch(`/api/conversations/${conversationId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Device-Token": token },
      body: JSON.stringify({
        role: msg.role,
        content: msg.content,
        kind: msg.kind ?? "text",
        mail: msg.mail ?? false,
        sources: msg.sources,
      }),
    });
    if (!res.ok) throw new Error("save failed");
    const data = await res.json();
    return data.id ?? null;
  } catch {
    return null;
  }
}
