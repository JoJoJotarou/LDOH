import { NextRequest, NextResponse } from "next/server";
import { getAdminUser } from "@/lib/admin/auth";

export async function GET(request: NextRequest) {
  const admin = await getAdminUser(request.cookies);
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({
    userId: admin.userId,
    username: admin.username,
    role: admin.role,
  });
}
