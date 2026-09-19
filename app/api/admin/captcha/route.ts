import { NextResponse } from "next/server";
import { issueCaptcha } from "@/lib/captcha";

export const dynamic = "force-dynamic";

// GET /api/admin/captcha — fresh math challenge (5-minute expiry, signed).
export async function GET() {
  const { token, problem } = issueCaptcha();
  return NextResponse.json({ token, problem });
}
