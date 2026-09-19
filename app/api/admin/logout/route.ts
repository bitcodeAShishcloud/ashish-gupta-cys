import { NextResponse } from "next/server";
import { clearSessionCookieHeader } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

// POST /api/admin/logout — clear the admin session cookie.
export async function POST() {
  const res = NextResponse.json({ ok: true, message: "Logged out." });
  res.headers.append("set-cookie", clearSessionCookieHeader());
  return res;
}
