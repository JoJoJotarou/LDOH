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
    const devActorId = Number(process.env.LD_DEV_USER_ID);
    let actorId = Number.isFinite(devActorId) && devActorId > 0 ? devActorId : 0;
    let actorUsername = process.env.LD_DEV_USERNAME || "dev";
    if (process.env.ENV !== "dev") {
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

    const insertResponse = await supabaseAdmin
      .from("site")
      .insert({
        name: payload.name.trim(),
        description: normalizeString(payload.description) || null,
        registration_limit: Number(payload.registrationLimit) || 0,
        api_base_url: normalizedApiBaseUrl,
        supports_immersive_translation: Boolean(
          payload.supportsImmersiveTranslation
        ),
        supports_ldc: Boolean(payload.supportsLdc),
        supports_checkin: Boolean(payload.supportsCheckin),
        supports_nsfw: Boolean(payload.supportsNsfw),
        checkin_url: normalizeString(payload.checkinUrl) || null,
        checkin_note: normalizeString(payload.checkinNote) || null,
        benefit_url: normalizeString(payload.benefitUrl) || null,
        rate_limit: normalizeString(payload.rateLimit) || null,
        status_url: normalizeString(payload.statusUrl) || null,
        is_visible: payload.isVisible ?? true,
        created_by: actorId > 0 ? actorId : null,
        updated_by: actorId > 0 ? actorId : null,
      })
      .select("id")
      .single();

    if (insertResponse.error || !insertResponse.data) {
      return NextResponse.json(
        { error: insertResponse.error?.message || "Insert failed" },
        { status: 500 }
      );
    }

    const siteId = insertResponse.data.id as string;

    const tags = normalizeList<string>(payload.tags)
      .map((tag) => tag.trim())
      .filter(Boolean);
    const tagInsertPromise =
      tags.length > 0
        ? supabaseAdmin
            .from("site_tags")
            .insert(
              tags.map((tagId) => ({
                site_id: siteId,
                tag_id: tagId,
                created_by: actorId > 0 ? actorId : null,
              }))
            )
        : Promise.resolve({ error: null });

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
    const maintainerInsertPromise =
      resolvedMaintainers.length > 0
        ? supabaseAdmin.from("site_maintainers").insert(
            resolvedMaintainers.map((maintainer, index) => ({
              site_id: siteId,
              name: maintainer.name,
              username: maintainer.username || null,
              profile_url: maintainer.profileUrl,
              sort_order: index,
              created_by: actorId > 0 ? actorId : null,
              updated_by: actorId > 0 ? actorId : null,
            }))
          )
        : Promise.resolve({ error: null });

    const extensionLinks = normalizeList<ExtensionPayload>(
      payload.extensionLinks
    )
      .map((link) => ({
        label: normalizeString(link.label),
        url: normalizeString(link.url),
      }))
      .filter((link) => link.label && link.url);
    const extensionInsertPromise =
      extensionLinks.length > 0
        ? supabaseAdmin.from("site_extension_links").insert(
            extensionLinks.map((link, index) => ({
              site_id: siteId,
              label: link.label,
              url: link.url,
              sort_order: index,
              created_by: actorId > 0 ? actorId : null,
              updated_by: actorId > 0 ? actorId : null,
            }))
          )
        : Promise.resolve({ error: null });

    const [tagInsert, maintainerInsert, extensionInsert] = await Promise.all([
      tagInsertPromise,
      maintainerInsertPromise,
      extensionInsertPromise,
    ]);

    const insertError =
      tagInsert.error || maintainerInsert.error || extensionInsert.error;
    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    const logInsert = await supabaseAdmin.from("site_logs").insert({
      site_id: siteId,
      action: "CREATE",
      actor_id: actorId,
      actor_username: actorUsername,
      message: "创建站点",
    });
    if (logInsert.error) {
      return NextResponse.json(
        { error: logInsert.error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ id: siteId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create site";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    if (process.env.ENV === "dev") {
      const devLevel = Number(process.env.LD_DEV_TRUST_LEVEL);
      const trustLevel =
        Number.isFinite(devLevel) && devLevel >= 0 ? devLevel : 2;
      const sites = await loadSitesData({
        includeHidden: true,
        maxRegistrationLimit: trustLevel,
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
    });
    const tags = buildTagOptionsFromSites(sites);
    return NextResponse.json({ sites, tags });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load data";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
