/* AES-256-GCM encryption for admin-managed provider API keys (Phase 9).
 *
 * Server-only. The master key lives in PROVIDER_ENCRYPTION_KEY env (32-byte
 * hex). Provider keys are stored as enc:v1:<iv>:<tag>:<ciphertext> (base64).
 * Plain env values pass through unchanged so the hybrid fallback needs no
 * migration. Authenticated encryption means a tampered ciphertext fails to
 * decrypt instead of yielding garbage.
 */

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

const PREFIX = "enc:v1:";

function masterKey(): Buffer {
  const raw = process.env.PROVIDER_ENCRYPTION_KEY || "";
  if (!raw) throw new Error("PROVIDER_ENCRYPTION_KEY is not set.");
  // Accept exactly 64 hex chars (32 bytes); otherwise derive a stable 32-byte
  // key from whatever the owner supplied (still deterministic across boots).
  if (/^[0-9a-fA-F]{64}$/.test(raw)) return Buffer.from(raw, "hex");
  return createHash("sha256").update(raw).digest();
}

export function isEncrypted(s: string): boolean {
  return typeof s === "string" && s.startsWith(PREFIX);
}

export function encryptKey(plain: string): string {
  if (!plain) return "";
  if (isEncrypted(plain)) return plain; // idempotent
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", masterKey(), iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString("base64")}:${tag.toString("base64")}:${ct.toString("base64")}`;
}

export function decryptKey(stored: string): string {
  if (!stored) return "";
  if (!isEncrypted(stored)) return stored; // legacy/plaintext env value
  try {
    const parts = stored.slice(PREFIX.length).split(":");
    if (parts.length !== 3) throw new Error("bad envelope");
    const iv = Buffer.from(parts[0], "base64");
    const tag = Buffer.from(parts[1], "base64");
    const ct = Buffer.from(parts[2], "base64");
    const decipher = createDecipheriv("aes-256-gcm", masterKey(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
  } catch {
    // Never leak the token or the crypto error detail to logs/callers.
    console.error("[crypto] failed to decrypt a provider key (wrong key or tampered data)");
    return "";
  }
}

export function encryptionConfigured(): boolean {
  return Boolean(process.env.PROVIDER_ENCRYPTION_KEY);
}
