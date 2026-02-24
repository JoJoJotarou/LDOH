import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/supabaseAdmin";
import { getLdUserWithCache } from "@/lib/auth/ld-user";
import { getSessionIdFromCookies } from "@/lib/auth/ld-oauth";
import { API_ERROR_CODES } from "@/lib/constants/error-codes";

const VALID_REPORT_TYPES = ["runaway", "fake_charity"] as const;
type ReportType = (typeof VALID_REPORT_TYPES)[number];

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const siteId = params.id;
    if (!siteId) {
      return NextResponse.json({ error: "Missing site id" }, { status: 400 });
    }

    // 认证
    let userId: number;
    let username: string;

    if (process.env.ENV === "dev") {
      const { getDevUserConfig } = await import("@/lib/auth/dev-user");
      const devUser = getDevUserConfig();
      userId = devUser.id;
      username = devUser.username;
    } else {
      const sessionId = getSessionIdFromCookies(request.cookies);
      if (!sessionId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      const user = await getLdUserWithCache({ sessionId });
      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      userId = user.id;
      username = user.username;
    }

    // 验证站点存在
    const { data: site, error: siteError } = await supabaseAdmin
      .from("site")
      .select("id")
      .eq("id", siteId)
      .maybeSingle();

    if (siteError) {
      return NextResponse.json({ error: siteError.message }, { status: 500 });
    }
    if (!site) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 });
    }

    // 解析请求体
    const body = await request.json();
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";
    const reportType = body.reportType as ReportType | undefined;
    if (!reason || reason.length > 500) {
      return NextResponse.json(
        { error: "报告原因不能为空且不超过500字" },
        { status: 400 }
      );
    }
    if (!reportType || !VALID_REPORT_TYPES.includes(reportType)) {
      return NextResponse.json(
        { error: "报告类型无效" },
        { status: 400 }
      );
    }

    // 若该站点该类型已有 pending 报告，则拒绝新报告
    const { data: existingPending, error: pendingError } = await supabaseAdmin
      .from("site_reports")
      .select("id")
      .eq("site_id", siteId)
      .eq("report_type", reportType)
      .eq("status", "pending")
      .limit(1)
      .maybeSingle();

    if (pendingError) {
      return NextResponse.json({ error: pendingError.message }, { status: 500 });
    }
    if (existingPending) {
      return NextResponse.json(
        {
          error: "该类型报告已在处理中，暂不接受新的报告",
          code: API_ERROR_CODES.REPORT_PENDING_EXISTS,
        },
        { status: 409 }
      );
    }

    // 插入报告记录
    const { error: insertError } = await supabaseAdmin
      .from("site_reports")
      .insert({
        site_id: siteId,
        reporter_id: userId,
        reporter_username: username,
        report_type: reportType,
        reason,
      });

    if (insertError) {
      // 唯一索引冲突（并发兜底）
      if (insertError.code === "23505") {
        return NextResponse.json(
          {
            error: "该类型报告已在处理中，暂不接受新的报告",
            code: API_ERROR_CODES.REPORT_PENDING_EXISTS,
          },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to submit report";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
