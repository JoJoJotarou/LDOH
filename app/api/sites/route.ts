import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/supabaseAdmin";
import { getLdUserWithCache } from "@/lib/auth/ld-user";
import { getSessionIdFromCookies } from "@/lib/auth/ld-oauth";
import { buildTagOptionsFromSites, loadSitesData } from "@/lib/server/siteData";
import {
  normalizeApiBaseUrl,
  checkApiBaseUrlExists,
  UrlValidationError,
} from "@/lib/utils/url";
import { API_ERROR_CODES, type ApiErrorResponse } from "@/lib/constants/error-codes";
import { getDevUserConfig } from "@/lib/auth/dev-user";

type MaintainerPayload = {
  name: string;
  id: string;
  profileUrl?: string;
  username?: string;
};

type ExtensionPayload = {
  label: string;
  url: string;
};

type SitePayload = {
  name: string;
  description?: string;
  registrationLimit: number;
  apiBaseUrl: string;
  tags: string[];
  supportsImmersiveTranslation: boolean;
  supportsLdc: boolean;
  supportsCheckin: boolean;
  supportsNsfw: boolean;
  checkinUrl?: string;
  checkinNote?: string;
  benefitUrl?: string;
  rateLimit?: string;
  statusUrl?: string;
  maintainers: MaintainerPayload[];
  extensionLinks: ExtensionPayload[];
  isVisible?: boolean;
};

function normalizeString(value?: string | null) {
  return value?.trim() || "";
}

function normalizeList<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

export async function POST(request: NextRequest) {
  try {
    let actorId = 0;
    let actorUsername = "";
    if (process.env.ENV === "dev") {
      const devUser = getDevUserConfig();
      actorId = devUser.id;
      actorUsername = devUser.username;
    } else {
      const sessionId = getSessionIdFromCookies(request.cookies);
      if (!sessionId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const user = await getLdUserWithCache({
        sessionId,
        options: { requireId: true },
      });
      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      actorId = user.id;
      actorUsername = user.username;
      if (user.trust_level < 2) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const payload = (await request.json()) as SitePayload;
    if (!payload?.name || !payload?.apiBaseUrl) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }
    const siteName = payload.name.trim();
    const registrationLimit = Number(payload.registrationLimit) || 0;

    // 新增：检查描述字段权限
    // 新建时禁止所有人填写描述，需要站长后续补充
    if (payload.description && payload.description.trim()) {
      return NextResponse.json<ApiErrorResponse>(
        {
          error: "新建站点时无法填写描述，请在创建后由站长补充",
          code: API_ERROR_CODES.DESCRIPTION_PERMISSION_DENIED
        },
        { status: 403 }
      );
    }

    let normalizedApiBaseUrl = "";
    try {
      normalizedApiBaseUrl = normalizeApiBaseUrl(payload.apiBaseUrl).normalized;
    } catch (error) {
      if (error instanceof UrlValidationError) {
        return NextResponse.json({ error: "Invalid URL format" }, { status: 400 });
      }
      throw error;
    }

    const conflict = await checkApiBaseUrlExists(normalizedApiBaseUrl);
    if (conflict.exists && conflict.conflictingSite) {
      return NextResponse.json(
        { error: "API Base URL 已存在", conflictingSite: conflict.conflictingSite },
        { status: 409 }
      );
    }

    const tags = normalizeList<string>(payload.tags)
      .map((tag) => tag.trim())
      .filter(Boolean);
    const maintainers = normalizeList<MaintainerPayload>(payload.maintainers)
      .map((maintainer) => ({
        name: normalizeString(maintainer.name),
        profileUrl: normalizeString(maintainer.profileUrl) || null,
        username: normalizeString(maintainer.username) || null,
      }))
      .filter((maintainer) => maintainer.name || maintainer.profileUrl);
    if (maintainers.length === 0) {
      return NextResponse.json(
        { error: "至少添加一位维护者（站长）" },
        { status: 400 }
      );
    }
    const resolvedMaintainers = await Promise.all(
      maintainers.map(async (maintainer) => {
        const profileUrl = maintainer.profileUrl || "";
        const match = profileUrl.match(/linux\.do\/u\/([^/]+)\/summary/i);
        const username = maintainer.username || (match ? match[1] : "");
        return {
          ...maintainer,
          username,
        };
      })
    );

    const extensionLinks = normalizeList<ExtensionPayload>(
      payload.extensionLinks
    )
      .map((link) => ({
        label: normalizeString(link.label),
        url: normalizeString(link.url),
      }))
      .filter((link) => link.label && link.url);
    const createdBy = actorId > 0 ? actorId : null;
    const createResponse = await supabaseAdmin.rpc(
      "create_site_with_notification",
      {
        p_name: siteName,
        p_description: normalizeString(payload.description) || null,
        p_registration_limit: registrationLimit,
        p_api_base_url: normalizedApiBaseUrl,
        p_supports_immersive_translation: Boolean(
          payload.supportsImmersiveTranslation
        ),
        p_supports_ldc: Boolean(payload.supportsLdc),
        p_supports_checkin: Boolean(payload.supportsCheckin),
        p_supports_nsfw: Boolean(payload.supportsNsfw),
        p_checkin_url: normalizeString(payload.checkinUrl) || null,
        p_checkin_note: normalizeString(payload.checkinNote) || null,
        p_benefit_url: normalizeString(payload.benefitUrl) || null,
        p_rate_limit: normalizeString(payload.rateLimit) || null,
        p_status_url: normalizeString(payload.statusUrl) || null,
        p_is_only_maintainer_visible: payload.isVisible ?? true,
        p_actor_id: actorId,
        p_actor_username: actorUsername,
        p_created_by: createdBy,
        p_tags: tags,
        p_maintainers: resolvedMaintainers,
        p_extension_links: extensionLinks,
      }
    );
    if (createResponse.error || !createResponse.data) {
      return NextResponse.json(
        { error: createResponse.error?.message || "Insert failed" },
        { status: 500 }
      );
    }

    const siteId = createResponse.data as string;
    return NextResponse.json({ id: siteId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create site";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const mode = request.nextUrl.searchParams.get("mode");
    const runawayOnly = mode === "runaway";

    if (process.env.ENV === "dev") {
      const devUser = getDevUserConfig();
      const sites = await loadSitesData({
        includeHidden: true,
        maxRegistrationLimit: devUser.trustLevel,
        runawayOnly,
      });
      const tags = buildTagOptionsFromSites(sites);
      return NextResponse.json({ sites, tags });
    }

    const sessionId = getSessionIdFromCookies(request.cookies);
    if (!sessionId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await getLdUserWithCache({ sessionId });
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const sites = await loadSitesData({
      username: user.username,
      maxRegistrationLimit: user.trust_level,
      runawayOnly,
    });
    const tags = buildTagOptionsFromSites(sites);
    return NextResponse.json({ sites, tags });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load data";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
