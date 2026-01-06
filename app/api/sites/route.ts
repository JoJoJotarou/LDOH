import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/supabaseAdmin";
import { fetchLdUser } from "@/lib/auth/ld-user";
import { getOAuthTokenFromCookies, getSessionSecret } from "@/lib/auth/ld-oauth";
import { buildTagOptionsFromSites, loadSitesData } from "@/lib/server/siteData";

type MaintainerPayload = {
  name: string;
  id: string;
  profileUrl?: string;
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
    if (process.env.ENV !== "dev") {
      const token = getOAuthTokenFromCookies(request.cookies, getSessionSecret());
      if (!token) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const user = await fetchLdUser(token.accessToken);
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

    const insertResponse = await supabaseAdmin
      .from("site")
      .insert({
        name: payload.name.trim(),
        description: normalizeString(payload.description) || null,
        registration_limit: Number(payload.registrationLimit) || 0,
        api_base_url: payload.apiBaseUrl.trim(),
        supports_immersive_translation: Boolean(
          payload.supportsImmersiveTranslation
        ),
        supports_ldc: Boolean(payload.supportsLdc),
        supports_checkin: Boolean(payload.supportsCheckin),
        checkin_url: normalizeString(payload.checkinUrl) || null,
        checkin_note: normalizeString(payload.checkinNote) || null,
        benefit_url: normalizeString(payload.benefitUrl) || null,
        rate_limit: normalizeString(payload.rateLimit) || null,
        status_url: normalizeString(payload.statusUrl) || null,
        is_visible: payload.isVisible ?? true,
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
            .insert(tags.map((tagId) => ({ site_id: siteId, tag_id: tagId })))
        : Promise.resolve({ error: null });

    const maintainers = normalizeList<MaintainerPayload>(payload.maintainers)
      .map((maintainer) => ({
        name: normalizeString(maintainer.name),
        profileUrl: normalizeString(maintainer.profileUrl) || null,
      }))
      .filter((maintainer) => maintainer.name || maintainer.profileUrl);
    const maintainerInsertPromise =
      maintainers.length > 0
        ? supabaseAdmin.from("site_maintainers").insert(
            maintainers.map((maintainer, index) => ({
              site_id: siteId,
              name: maintainer.name,
              profile_url: maintainer.profileUrl,
              sort_order: index,
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

    const token = getOAuthTokenFromCookies(request.cookies, getSessionSecret());
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await fetchLdUser(token.accessToken);
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
