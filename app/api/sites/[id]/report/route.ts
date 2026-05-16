import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/supabaseAdmin";
import { getLdUserWithCache } from "@/lib/auth/ld-user";
import { getSessionIdFromCookies } from "@/lib/auth/ld-oauth";
import { API_ERROR_CODES } from "@/lib/constants/error-codes";

const VALID_REPORT_TYPES = ["runaway", "fake_charity"] as const;
const VALID_EVIDENCE_TYPES = ["screenshot", "announcement_link"] as const;

type ReportType = (typeof VALID_REPORT_TYPES)[number];
type EvidenceType = (typeof VALID_EVIDENCE_TYPES)[number];

function isValidUrl(str: string): boolean {
  try {
    const url = new URL(str);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function isValidImageUrl(url: string): boolean {
  if (!isValidUrl(url)) return false;
  const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".svg"];
  const lower = url.toLowerCase().split("?")[0];
  return imageExtensions.some((ext) => lower.endsWith(ext));
}

function isValidLinuxDoTopicUrl(url: string): boolean {
  if (!isValidUrl(url)) return false;
  try {
    const parsed = new URL(url);
    return (
      parsed.hostname === "linux.do" &&
      /^\/t\/[^/]+\/\d+$/.test(parsed.pathname)
    );
  } catch {
    return false;
  }
}

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
    const evidenceType = body.evidenceType as EvidenceType | undefined;
    const evidenceUrl = typeof body.evidenceUrl === "string" ? body.evidenceUrl.trim() : "";

    // 验证原因
    if (!reason || reason.length > 500) {
      return NextResponse.json(
        { error: "报告原因不能为空且不超过500字" },
        { status: 400 }
      );
    }

    // 验证报告类型
    if (!reportType || !VALID_REPORT_TYPES.includes(reportType)) {
      return NextResponse.json(
        { error: "报告类型无效" },
        { status: 400 }
      );
    }

    // 验证证据
    if (!evidenceUrl) {
      return NextResponse.json(
        { error: "必须提供证据链接" },
        { status: 400 }
      );
    }

    if (!evidenceType || !VALID_EVIDENCE_TYPES.includes(evidenceType)) {
      return NextResponse.json(
        { error: "证据类型无效" },
        { status: 400 }
      );
    }

    if (!isValidUrl(evidenceUrl)) {
      return NextResponse.json(
        { error: "证据链接格式无效" },
        { status: 400 }
      );
    }

    if (evidenceType === "screenshot" && !isValidImageUrl(evidenceUrl)) {
      return NextResponse.json(
        { error: "截图证据必须是有效的图片链接（以.jpg/.png/.gif等结尾）" },
        { status: 400 }
      );
    }

    if (reportType === "fake_charity" && evidenceType !== "screenshot") {
      return NextResponse.json(
        { error: "伪公益举报必须提供截图证据" },
        { status: 400 }
      );
    }

    if (reportType === "runaway" && evidenceType === "announcement_link" && !isValidLinuxDoTopicUrl(evidenceUrl)) {
      return NextResponse.json(
        { error: "站长公告必须是 Linux.do 帖子链接，格式如 https://linux.do/t/topic/123456" },
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
        evidence_type: evidenceType,
        evidence_url: evidenceUrl,
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
