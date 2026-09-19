import { NextRequest, NextResponse } from "next/server";
import { readJsonBody, clientIp, rateLimit } from "@/lib/chat-http";
import { adminConfigured, checkCredentials, createSessionToken, sessionCookieHeader } from "@/lib/admin-auth";
import { verifyCaptcha } from "@/lib/captcha";

export const dynamic = "force-dynamic";

const LOGIN_RATE_LIMIT = 8; // attempts / min / IP

// POST /api/admin/login { username, password, captchaToken, captchaAnswer }
// Server-side credential check (env only), signed captcha, HMAC session cookie.
export async function POST(req: NextRequest) {
  if (!rateLimit("admin-login:" + clientIp(req), LOGIN_RATE_LIMIT)) {
    return NextResponse.json(
      { error: "rate_limited", message: "Too many attempts. Try again in a minute." },
      { status: 429 },
    );
  }

  const body = await readJsonBody(req);
  const username = String(body.username ?? "").trim().slice(0, 64);
  const password = String(body.password ?? "").slice(0, 128);
  const captchaToken = String(body.captchaToken ?? "");
  const captchaAnswer = String(body.captchaAnswer ?? "").trim();

  if (!adminConfigured()) {
    return NextResponse.json(
      { error: "admin_not_configured", message: "Admin credentials are not configured on the server." },
      { status: 503 },
    );
  }
  if (!username || !password) {
    return NextResponse.json({ error: "bad_request", message: "Username and password are required." }, { status: 400 });
  }
  if (!verifyCaptcha(captchaToken, captchaAnswer)) {
    return NextResponse.json({ error: "captcha_failed", message: "Captcha answer is wrong or expired. Try a new one." }, { status: 400 });
  }
  if (!checkCredentials(username, password)) {
    return NextResponse.json({ error: "invalid_credentials", message: "Invalid username or password." }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true, message: "Authenticated." });
  res.headers.append("set-cookie", sessionCookieHeader(createSessionToken()));
  return res;
}
