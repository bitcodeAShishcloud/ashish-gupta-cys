import crypto from "node:crypto";
import { timingSafeEqualStr } from "./admin-auth";

/*
 * Stateless math captcha for the admin login. The token carries the
 * encrypted addends, a 16-byte nonce and an HMAC signature, so no
 * server-side state is needed (works on serverless) and — crucially —
 * the addends are NOT visible to the caller, so the challenge cannot be
 * self-answered by an attacker. Tampering invalidates it.
 */

const CAPTCHA_TTL_MS = 5 * 60 * 1000;

function secret(): string {
  return (
    process.env.ADMIN_SESSION_SECRET ||
    crypto
      .createHash("sha256")
      .update((process.env.ADMIN_PASSWORD || "") + ":admin-captcha")
      .digest("hex")
  );
}

function encKey(): Buffer {
  return crypto.createHash("sha256").update(`${secret()}:captcha-enc`).digest();
}

export function issueCaptcha(): { token: string; problem: string } {
  const a = crypto.randomInt(11, 99);
  const b = crypto.randomInt(11, 99);
  const exp = Date.now() + CAPTCHA_TTL_MS;
  const nonce = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-ctr", encKey(), nonce);
  const enc = Buffer.concat([cipher.update(`${a}|${b}`), cipher.final()]).toString(
    "base64",
  );
  const sig = crypto
    .createHmac("sha256", secret())
    .update(`${exp}|${nonce.toString("base64")}|${enc}`)
    .digest("base64");
  return {
    token: `${exp}.${nonce.toString("base64")}.${enc}.${sig}`,
    problem: `${a} + ${b} = ?`,
  };
}

export function verifyCaptcha(token: string, answer: string): boolean {
  const parts = String(token).split(".");
  if (parts.length !== 4) return false;
  const [exp, nonceB64, enc, sig] = parts;
  const expNum = Number(exp);
  if (!Number.isFinite(expNum) || Date.now() > expNum) return false;
  const nonce = Buffer.from(nonceB64, "base64");
  if (nonce.length !== 16) return false;
  const expected = crypto
    .createHmac("sha256", secret())
    .update(`${exp}|${nonceB64}|${enc}`)
    .digest("base64");
  if (!timingSafeEqualStr(sig, expected)) return false;
  let payload: string;
  try {
    const decipher = crypto.createDecipheriv("aes-256-ctr", encKey(), nonce);
    payload = Buffer.concat([
      decipher.update(Buffer.from(enc, "base64")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    return false;
  }
  // payload is server-produced ("a|b"); match keeps the check allocation-free
  const m = payload.match(/^(\d{2,3})\|(\d{2,3})$/);
  if (!m) return false;
  return Number(answer) === Number(m[1]) + Number(m[2]);
}
