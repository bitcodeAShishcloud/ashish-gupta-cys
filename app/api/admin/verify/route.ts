import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest, adminConfigured } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

// GET /api/admin/verify — is the session cookie a valid admin session?
export async function GET(req: NextRequest) {
  if (!adminConfigured()) {
    return NextResponse.json({ admin: false, reason: "admin_not_configured" }, { status: 403 });
  }
  if (!isAdminRequest(req)) {
    return NextResponse.json({ admin: false, reason: "unauthenticated" }, { status: 401 });
  }
  return NextResponse.json({ admin: true });
}
