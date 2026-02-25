import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/supabaseAdmin";
import { getLdUserWithCache } from "@/lib/auth/ld-user";
import { getSessionIdFromCookies } from "@/lib/auth/ld-oauth";
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
  isOnlyMaintainerVisible?: boolean;
  updatedAt?: string;
};

function normalizeString(value?: string | null) {
  return value?.trim() || "";
}

function normalizeList<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function formatValue(value: string | number | boolean | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return "空";
  }
  if (typeof value === "boolean") {
    return value ? "是" : "否";
  }
  return String(value);
}

function formatList(values: string[]) {
  if (!values.length) return "空";
  return values.join(", ");
}

function normalizeTextList(values: string[]) {
  return Array.from(
    new Set(values.map((value) => value.trim()).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b));
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    let username = "";
    let actorId = 0;
    let actorUsername = "";
    if (process.env.ENV === "dev") {
      const devUser = getDevUserConfig();
      actorId = devUser.id;
      actorUsername = devUser.username;
      username = devUser.username;
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
      username = user.username;
    }

    const payload = (await request.json()) as SitePayload;
    const params = await context.params;
    const siteId = params.id;
    if (!siteId) {
      return NextResponse.json({ error: "Missing site id" }, { status: 400 });
    }

    let normalizedApiBaseUrl: string | undefined;
    if (payload.apiBaseUrl !== undefined) {
      try {
        normalizedApiBaseUrl = normalizeApiBaseUrl(payload.apiBaseUrl).normalized;
      } catch (error) {
        if (error instanceof UrlValidationError) {
          return NextResponse.json(
            { error: "Invalid URL format" },
            { status: 400 }
          );
        }
        throw error;
      }

      const conflict = await checkApiBaseUrlExists(normalizedApiBaseUrl, siteId);
      if (conflict.exists && conflict.conflictingSite) {
        return NextResponse.json(
          { error: "API Base URL 已存在", conflictingSite: conflict.conflictingSite },
          { status: 409 }
        );
      }
    }

    const [siteResponse, maintainerCheck, tagResponse, extensionResponse] =
      await Promise.all([
        supabaseAdmin
          .from("site")
          .select(
            "name,description,registration_limit,api_base_url,supports_immersive_translation,supports_ldc,supports_checkin,supports_nsfw,checkin_url,checkin_note,benefit_url,rate_limit,status_url,is_only_maintainer_visible,updated_at"
          )
          .eq("id", siteId)
          .single(),
        supabaseAdmin
          .from("site_maintainers")
          .select("name,username,profile_url,sort_order")
          .eq("site_id", siteId),
        supabaseAdmin
          .from("site_tags")
          .select("tag_id")
          .eq("site_id", siteId),
        supabaseAdmin
          .from("site_extension_links")
          .select("label,url,sort_order")
          .eq("site_id", siteId),
      ]);

    if (siteResponse.error) {
      return NextResponse.json(
        { error: siteResponse.error.message },
        { status: 500 }
      );
    }
    if (maintainerCheck.error) {
      return NextResponse.json(
        { error: maintainerCheck.error.message },
        { status: 500 }
      );
    }
    if (tagResponse.error) {
      return NextResponse.json(
        { error: tagResponse.error.message },
        { status: 500 }
      );
    }
    if (extensionResponse.error) {
      return NextResponse.json(
        { error: extensionResponse.error.message },
        { status: 500 }
      );
    }

    const maintainerIds = (maintainerCheck.data ?? [])
      .map((row) => row.username || row.profile_url || "")
      .map((value) => {
        if (value.includes("linux.do/u/")) {
          const match = value.match(/linux\.do\/u\/([^/]+)\/summary/i);
          return match ? match[1] : "";
        }
        return value;
      })
      .filter(Boolean);
    const isMaintainer = maintainerIds.some(
      (id) => id.toLowerCase() === username.toLowerCase()
    );

    const currentSite = siteResponse.data;
    const normalizedCurrentDescription = normalizeString(
      currentSite.description || ""
    );
    const normalizedNextDescription =
      payload.description === undefined
        ? normalizedCurrentDescription
        : normalizeString(payload.description);

    if (payload.isOnlyMaintainerVisible !== undefined && !isMaintainer) {
      return NextResponse.json<ApiErrorResponse>(
        {
          error: "Not allowed to change visibility",
          code: API_ERROR_CODES.VISIBILITY_PERMISSION_DENIED
        },
        { status: 403 }
      );
    }

    // 新增：检查站点描述修改权限
    if (
      payload.description !== undefined &&
      !isMaintainer &&
      normalizedNextDescription !== normalizedCurrentDescription
    ) {
      return NextResponse.json<ApiErrorResponse>(
        {
          error: "仅站长可以修改站点描述",
          code: API_ERROR_CODES.DESCRIPTION_PERMISSION_DENIED
        },
        { status: 403 }
      );
    }

    // 乐观锁检查
    if (payload.updatedAt) {
      const clientTime = new Date(payload.updatedAt).getTime();
      const serverTime = new Date(currentSite.updated_at || "").getTime();

      // 如果服务器数据比客户端数据新
      if (serverTime > clientTime) {
        return NextResponse.json(
          { error: "该站点已被他人修改，请刷新页面后重试" },
          { status: 409 }
        );
      }
    }

    const currentTags = normalizeTextList(
      (tagResponse.data ?? []).map((row) => row.tag_id || "")
    );
    const currentMaintainers = (maintainerCheck.data ?? [])
      .slice()
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map((row) => row.name || row.username || row.profile_url || "")
      .filter(Boolean);
    const currentExtensions = (extensionResponse.data ?? [])
      .slice()
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map((row) => `${row.label}(${row.url})`);

    const nextTags = normalizeTextList(
      normalizeList<string>(payload.tags).map((tag) => tag.trim())
    );
    const nextMaintainers = normalizeList<MaintainerPayload>(payload.maintainers)
      .map((maintainer) => normalizeString(maintainer.name) || normalizeString(maintainer.profileUrl))
      .filter(Boolean);
    const nextExtensions = normalizeList<ExtensionPayload>(
      payload.extensionLinks
    )
      .map((link) => `${normalizeString(link.label)}(${normalizeString(link.url)})`)
      .filter((value) => value !== "()")
      .filter(Boolean);

    const changes: string[] = [];
    const pushChange = (
      label: string,
      before: string | number | boolean | null | undefined,
      after: string | number | boolean | null | undefined
    ) => {
      if (before === after) return;
      changes.push(`${label}: ${formatValue(before)} -> ${formatValue(after)}`);
    };
    pushChange("名称", currentSite.name, payload.name.trim());
    pushChange(
      "描述",
      normalizedCurrentDescription,
      normalizedNextDescription
    );
    pushChange(
      "登记等级",
      currentSite.registration_limit ?? 2,
      Number(payload.registrationLimit) || 0
    );
    pushChange(
      "API Base URL",
      currentSite.api_base_url,
      normalizedApiBaseUrl ?? payload.apiBaseUrl?.trim() ?? currentSite.api_base_url
    );
    pushChange(
      "沉浸式翻译",
      Boolean(currentSite.supports_immersive_translation),
      Boolean(payload.supportsImmersiveTranslation)
    );
    pushChange("LDC", Boolean(currentSite.supports_ldc), Boolean(payload.supportsLdc));
    pushChange(
      "签到",
      Boolean(currentSite.supports_checkin),
      Boolean(payload.supportsCheckin)
    );
    pushChange(
      "NSFW",
      Boolean(currentSite.supports_nsfw),
      Boolean(payload.supportsNsfw)
    );
    pushChange(
      "签到页",
      normalizeString(currentSite.checkin_url || ""),
      normalizeString(payload.checkinUrl)
    );
    pushChange(
      "签到说明",
      normalizeString(currentSite.checkin_note || ""),
      normalizeString(payload.checkinNote)
    );
    pushChange(
      "福利站",
      normalizeString(currentSite.benefit_url || ""),
      normalizeString(payload.benefitUrl)
    );
    pushChange(
      "速率限制",
      normalizeString(currentSite.rate_limit || ""),
      normalizeString(payload.rateLimit)
    );
    pushChange(
      "状态页",
      normalizeString(currentSite.status_url || ""),
      normalizeString(payload.statusUrl)
    );
    if (payload.isOnlyMaintainerVisible !== undefined) {
      pushChange(
        "仅站长可见",
        Boolean(currentSite.is_only_maintainer_visible),
        Boolean(payload.isOnlyMaintainerVisible)
      );
    }
    if (currentTags.join("|") !== nextTags.join("|")) {
      changes.push(`标签: ${formatList(currentTags)} -> ${formatList(nextTags)}`);
    }
    if (currentMaintainers.join("|") !== nextMaintainers.join("|")) {
      changes.push(
        `站长: ${formatList(currentMaintainers)} -> ${formatList(nextMaintainers)}`
      );
    }
    if (currentExtensions.join("|") !== nextExtensions.join("|")) {
      changes.push(
        `更多链接: ${formatList(currentExtensions)} -> ${formatList(nextExtensions)}`
      );
    }

    const updateResponse = await supabaseAdmin
      .from("site")
      .update({
        name: payload.name.trim(),
        description:
          payload.description === undefined
            ? currentSite.description
            : normalizeString(payload.description) || null,
        registration_limit: Number(payload.registrationLimit) || 0,
        api_base_url: normalizedApiBaseUrl ?? payload.apiBaseUrl?.trim(),
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
        is_only_maintainer_visible:
          payload.isOnlyMaintainerVisible === undefined
            ? undefined
            : Boolean(payload.isOnlyMaintainerVisible),
        updated_by: actorId > 0 ? actorId : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", siteId);

    if (updateResponse.error) {
      return NextResponse.json(
        { error: updateResponse.error.message },
        { status: 500 }
      );
    }

    const [deleteTags, deleteMaintainers, deleteExtensions] = await Promise.all([
      supabaseAdmin.from("site_tags").delete().eq("site_id", siteId),
      supabaseAdmin.from("site_maintainers").delete().eq("site_id", siteId),
      supabaseAdmin.from("site_extension_links").delete().eq("site_id", siteId),
    ]);

    const deleteError =
      deleteTags.error || deleteMaintainers.error || deleteExtensions.error;
    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

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

    const message =
      changes.length > 0 ? `修改了：${changes.join("；")}` : "修改站点（无字段变更）";
    const logInsert = await supabaseAdmin.from("site_logs").insert({
      site_id: siteId,
      action: "UPDATE",
      actor_id: actorId,
      actor_username: actorUsername,
      message,
    });
    if (logInsert.error) {
      return NextResponse.json(
        { error: logInsert.error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ id: siteId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update site";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
