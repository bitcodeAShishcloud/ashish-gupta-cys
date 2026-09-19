import crypto from "node:crypto";
import { timingSafeEqualStr } from "./admin-auth";

/*
 * Stateless math captcha for the admin login. The token encodes the two
 * addends, an expiry and an HMAC signature — so no server-side state is
 * needed (works on serverless) and tampering invalidates it.
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

export function issueCaptcha(): { token: string; problem: string } {
  const a = crypto.randomInt(11, 99);
  const b = crypto.randomInt(11, 99);
  const exp = Date.now() + CAPTCHA_TTL_MS;
  const sig = crypto.createHmac("sha256", secret()).update(`${a}|${b}|${exp}`).digest("hex").slice(0, 32);
  return { token: `${a}-${b}-${exp}-${sig}`, problem: `${a} + ${b} = ?` };
}

export function verifyCaptcha(token: string, answer: string): boolean {
  const parts = String(token).split("-");
  if (parts.length !== 4) return false;
  const [a, b, exp, sig] = parts;
  const expNum = Number(exp);
  if (!Number.isFinite(expNum) || Date.now() > expNum) return false;
  const expected = crypto.createHmac("sha256", secret()).update(`${a}|${b}|${exp}`).digest("hex").slice(0, 32);
  if (!timingSafeEqualStr(sig, expected)) return false;
  return Number(answer) === Number(a) + Number(b);
}
