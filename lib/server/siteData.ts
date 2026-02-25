/**
 * Data Service Implementation
 * 服务端使用 Supabase admin key 读取数据
 */

import { Site } from "@/lib/contracts/types/site";
import { Tag } from "@/lib/contracts/types/tag";
import { supabaseAdmin } from "@/lib/db/supabaseAdmin";

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const DEFAULT_TAGS = ["Claude Code", "Codex", "Gemini CLI"];

type SupabaseSite = {
  id: string;
  name: string;
  description: string | null;
  registration_limit: number | null;
  api_base_url: string;
  supports_immersive_translation: boolean | null;
  supports_ldc: boolean | null;
  supports_checkin: boolean | null;
  supports_nsfw: boolean | null;
  checkin_url: string | null;
  checkin_note: string | null;
  benefit_url: string | null;
  rate_limit: string | null;
  status_url: string | null;
  is_only_maintainer_visible: boolean | null;
  requires_invite_code: boolean | null;
  is_runaway: boolean | null;
  is_fake_charity: boolean | null;
  updated_at: string | null;
};

type SupabaseTagLink = {
  site_id: string;
  tag_id: string;
};

type SupabaseMaintainer = {
  site_id: string;
  name: string;
  username?: string | null;
  profile_url: string | null;
  sort_order: number | null;
};

type SupabaseExtensionLink = {
  site_id: string;
  label: string;
  url: string;
  sort_order: number | null;
};

type SupabaseHealth = {
  site_id: string;
  status: string;
  http_status: number | null;
  latency_ms: number | null;
  checked_at: string | null;
  error: string | null;
  response_url: string | null;
};

type SupabaseReport = {
  site_id: string;
  report_type: string;
  reason: string | null;
  reporter_username: string | null;
  created_at: string | null;
};

type MaintainerEntry = {
  name: string;
  id: string;
  username?: string;
  profileUrl?: string;
  sortOrder: number;
};

function parseLinuxDoId(value?: string | null) {
  if (!value) return "";
  const match = value.match(/linux\.do\/u\/([^/]+)\/summary/i);
  return match ? match[1] : "";
}

function validateSites(data: unknown): data is Site[] {
  return (
    Array.isArray(data) &&
    data.every((item) => {
      return (
        typeof item === "object" &&
        item !== null &&
        typeof (item as Site).id === "string" &&
        typeof (item as Site).name === "string" &&
        typeof (item as Site).apiBaseUrl === "string" &&
        Array.isArray((item as Site).tags)
      );
    })
  );
}

async function loadSitesFromSupabase(options?: {
  includeIds?: string[];
  includeHidden?: boolean;
  maxRegistrationLimit?: number;
  runawayOnly?: boolean;
}): Promise<Site[]> {
  let siteQuery = supabaseAdmin.from("site").select("*");
  if (options?.includeHidden) {
    // no filter on visibility
  } else if (options?.includeIds && options.includeIds.length > 0) {
    siteQuery = siteQuery.or(
      `is_only_maintainer_visible.eq.false,id.in.(${options.includeIds.join(",")})`
    );
  } else {
    siteQuery = siteQuery.eq("is_only_maintainer_visible", false);
  }
  if (options?.runawayOnly) {
    siteQuery = siteQuery.eq("is_runaway", true);
  } else {
    siteQuery = siteQuery.eq("is_active", true);
    siteQuery = siteQuery.eq("is_runaway", false);
    siteQuery = siteQuery.eq("is_fake_charity", false);
  }
  if (
    typeof options?.maxRegistrationLimit === "number" &&
    Number.isFinite(options.maxRegistrationLimit)
  ) {
    siteQuery = siteQuery.lte("registration_limit", options.maxRegistrationLimit);
  }

  const sitesResponse = await siteQuery;

  if (sitesResponse.error) {
    throw new Error(`Supabase fetch failed: ${sitesResponse.error.message}`);
  }

  const sites = (sitesResponse.data ?? []) as SupabaseSite[];
  const siteIds = sites.map((site) => site.id);
  if (siteIds.length === 0) {
    return [];
  }

  const [
    tagLinksResponse,
    maintainersResponse,
    extensionLinksResponse,
    healthResponse,
    reportsResponse,
  ] =
    await Promise.all([
      supabaseAdmin
        .from("site_tags")
        .select("site_id,tag_id")
        .in("site_id", siteIds),
      supabaseAdmin
        .from("site_maintainers")
        .select("site_id,name,username,profile_url,sort_order")
        .in("site_id", siteIds),
      supabaseAdmin
        .from("site_extension_links")
        .select("site_id,label,url,sort_order")
        .in("site_id", siteIds),
      supabaseAdmin
        .from("site_health_status")
        .select("site_id,status,http_status,latency_ms,checked_at,error,response_url")
        .in("site_id", siteIds),
      supabaseAdmin
        .from("site_reports")
        .select("site_id,report_type,reason,reporter_username,created_at")
        .in("site_id", siteIds)
        .eq("status", "pending"),
    ]);

  if (tagLinksResponse.error) {
    throw new Error(`Supabase fetch failed: ${tagLinksResponse.error.message}`);
  }
  if (maintainersResponse.error) {
    throw new Error(
      `Supabase fetch failed: ${maintainersResponse.error.message}`
    );
  }
  if (extensionLinksResponse.error) {
    throw new Error(
      `Supabase fetch failed: ${extensionLinksResponse.error.message}`
    );
  }
  if (healthResponse.error) {
    throw new Error(`Supabase fetch failed: ${healthResponse.error.message}`);
  }
  if (reportsResponse.error) {
    throw new Error(`Supabase fetch failed: ${reportsResponse.error.message}`);
  }

  const tagLinks = (tagLinksResponse.data ?? []) as SupabaseTagLink[];
  const maintainers = (maintainersResponse.data ?? []) as SupabaseMaintainer[];
  const extensionLinks = (extensionLinksResponse.data ??
    []) as SupabaseExtensionLink[];
  const healthRows = (healthResponse.data ?? []) as SupabaseHealth[];
  const pendingReports = (reportsResponse.data ?? []) as SupabaseReport[];

  const tagsBySite = new Map<string, string[]>();
  for (const link of tagLinks) {
    if (!tagsBySite.has(link.site_id)) {
      tagsBySite.set(link.site_id, []);
    }
    tagsBySite.get(link.site_id)!.push(link.tag_id);
  }

  const maintainersBySite = new Map<string, MaintainerEntry[]>();
  for (const maintainer of maintainers) {
    const parsedUsername =
      maintainer.username ||
      parseLinuxDoId(maintainer.profile_url) ||
      "";
    if (!maintainersBySite.has(maintainer.site_id)) {
      maintainersBySite.set(maintainer.site_id, []);
    }
    maintainersBySite.get(maintainer.site_id)!.push({
      name: maintainer.name,
      id: parsedUsername,
      username: parsedUsername || undefined,
      profileUrl: maintainer.profile_url || undefined,
      sortOrder:
        typeof maintainer.sort_order === "number" ? maintainer.sort_order : 0,
    });
  }
  for (const list of maintainersBySite.values()) {
    list.sort((a, b) => a.sortOrder - b.sortOrder);
  }

  const extensionBySite = new Map<string, { label: string; url: string }[]>();
  for (const link of extensionLinks) {
    if (!extensionBySite.has(link.site_id)) {
      extensionBySite.set(link.site_id, []);
    }
    extensionBySite.get(link.site_id)!.push({
      label: link.label,
      url: link.url,
    });
  }

  const healthBySite = new Map<string, Site["health"]>();
  for (const row of healthRows) {
    if (row.status === "up" || row.status === "slow" || row.status === "down") {
      healthBySite.set(row.site_id, {
        status: row.status,
        httpStatus: row.http_status ?? undefined,
        latencyMs: row.latency_ms ?? undefined,
        checkedAt: row.checked_at ?? undefined,
        error: row.error ?? undefined,
        responseUrl: row.response_url ?? undefined,
      });
    }
  }

  const pendingReportSites = new Set(
    pendingReports.map((report) => report.site_id).filter(Boolean)
  );
  const pendingReportBySite = new Map<string, Site["pendingReport"]>();
  for (const report of pendingReports) {
    if (!report.site_id || pendingReportBySite.has(report.site_id)) continue;
    if (report.report_type !== "runaway" && report.report_type !== "fake_charity") {
      continue;
    }
    pendingReportBySite.set(report.site_id, {
      reportType: report.report_type,
      reason: report.reason ?? "",
      reporterUsername: report.reporter_username ?? undefined,
      createdAt: report.created_at ?? undefined,
    });
  }

  return sites.map((site) => ({
    id: site.id,
    name: site.name,
    description: site.description || "",
    registrationLimit: site.registration_limit ?? 2,
    icon: "",
    apiBaseUrl: site.api_base_url,
    tags: tagsBySite.get(site.id) ?? [],
    supportsImmersiveTranslation: Boolean(site.supports_immersive_translation),
    supportsLdc: Boolean(site.supports_ldc),
    supportsCheckin: Boolean(site.supports_checkin),
    supportsNsfw: Boolean(site.supports_nsfw),
    checkinUrl: site.checkin_url || "",
    checkinNote: site.checkin_note || "",
    benefitUrl: site.benefit_url || "",
    maintainers: (maintainersBySite.get(site.id) ?? []).map((maintainer) => ({
      name: maintainer.name,
      id: maintainer.id,
      username: maintainer.username,
      profileUrl: maintainer.profileUrl,
    })),
    rateLimit: site.rate_limit || "",
    statusUrl: site.status_url || "",
    extensionLinks: extensionBySite.get(site.id) ?? [],
    isOnlyMaintainerVisible: site.is_only_maintainer_visible ?? false,
    requiresInviteCode: Boolean(site.requires_invite_code),
    isRunaway: Boolean(site.is_runaway),
    isFakeCharity: Boolean(site.is_fake_charity),
    hasPendingReport: pendingReportSites.has(site.id),
    pendingReport: pendingReportBySite.get(site.id),
    updatedAt: site.updated_at || "",
    health: healthBySite.get(site.id),
  }));
}

export function buildTagOptionsFromSites(sites: Site[]): Tag[] {
  const normalized = new Map<string, string>();
  for (const preset of DEFAULT_TAGS) {
    normalized.set(preset.toLowerCase(), preset);
  }
  for (const site of sites) {
    for (const tag of site.tags) {
      if (tag) {
        normalized.set(tag.toLowerCase(), tag);
      }
    }
  }
  const merged = Array.from(normalized.values());
  const defaultLower = new Set(DEFAULT_TAGS.map((tag) => tag.toLowerCase()));
  const defaults = merged.filter((tag) => defaultLower.has(tag.toLowerCase()));
  const rest = merged
    .filter((tag) => !defaultLower.has(tag.toLowerCase()))
    .sort((a, b) => a.localeCompare(b));
  return [...defaults, ...rest];
}

function ensureConfigured() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Supabase admin access is not configured");
  }
}

async function loadMaintainerSiteIds(username: string): Promise<string[]> {
  if (!username) return [];
  const response = await supabaseAdmin
    .from("site_maintainers")
    .select("site_id,username,profile_url")
    .or(`username.ilike.${username},profile_url.ilike.%/u/${username}/summary%`);
  if (response.error) {
    throw new Error(`Supabase fetch failed: ${response.error.message}`);
  }
  const rows = response.data ?? [];
  return Array.from(
    new Set(
      rows.map((row) => (row as { site_id: string }).site_id).filter(Boolean)
    )
  );
}

export async function loadSitesData(options?: {
  username?: string;
  includeHidden?: boolean;
  maxRegistrationLimit?: number;
  runawayOnly?: boolean;
}): Promise<Site[]> {
  ensureConfigured();
  const includeIds =
    options?.username && !options.includeHidden
      ? await loadMaintainerSiteIds(options.username)
      : [];
  const sites = await loadSitesFromSupabase({
    includeIds,
    includeHidden: options?.includeHidden,
    maxRegistrationLimit: options?.maxRegistrationLimit,
    runawayOnly: options?.runawayOnly,
  });
  if (!validateSites(sites)) {
    throw new Error("Supabase returned invalid site data");
  }
  return sites;
}
