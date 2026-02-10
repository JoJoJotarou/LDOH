"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { Site } from "@/lib/contracts/types/site";
import { Tag } from "@/lib/contracts/types/tag";
import { FilterOptions } from "@/lib/contracts/types/filter";
import { userPreferenceService } from "@/features/sites/services/UserPreferenceService";
import { filterService } from "@/features/sites/services/FilterService";
import { Background } from "@/components/common/Background";
import { Navigation } from "@/components/common/Navigation";
import { FilterBar, ViewMode } from "@/features/sites/components/FilterBar";
import { SiteCard } from "@/features/sites/components/SiteCard";
import { SiteEditorDialog } from "@/features/sites/components/SiteEditorDialog";
import { SiteLogDialog } from "@/features/sites/components/SiteLogDialog";
import { SiteReportDialog } from "@/features/sites/components/SiteReportDialog";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";
import { API_ERROR_CODES } from "@/lib/constants/error-codes";

interface SiteHubPageProps {
  initialSites: Site[];
  tags: Tag[];
  dataWarning?: string;
}

type LdUser = {
  id: number;
  username: string;
  trust_level: number;
};

type SitesResponse = {
  sites: Site[];
  tags: Tag[];
};

const fetcher = (url: string) =>
  fetch(url).then((res) => res.json() as Promise<SitesResponse>);

export function SiteHubPage({
  initialSites,
  tags,
  dataWarning,
}: SiteHubPageProps) {
  // SWR for Sites Data
  const { data: sitesData, mutate } = useSWR<SitesResponse>(
    "/api/sites",
    fetcher,
    {
      fallbackData: { sites: initialSites, tags },
      revalidateOnFocus: true,
      focusThrottleInterval: Number(process.env.NEXT_PUBLIC_SWR_FOCUS_THROTTLE_INTERVAL) || 5 * 60 * 1000,
      refreshInterval: Number(process.env.NEXT_PUBLIC_SWR_REFRESH_INTERVAL) || 30 * 60 * 1000,
    }
  );

  const sites = sitesData?.sites ?? initialSites;
  const tagOptions = sitesData?.tags ?? tags;

  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState("all");
  const [selectedRegistrationLimit, setSelectedRegistrationLimit] =
    useState("all");
  const [selectedFeature, setSelectedFeature] = useState<
    "all" | "ldc" | "translation" | "checkin" | "nsfw"
  >("all");
  const [showHidden, setShowHidden] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [hidden, setHidden] = useState<string[]>([]);
  const [currentUser, setCurrentUser] = useState<LdUser | null>(null);
  
  // Editor Dialog State
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<"create" | "edit">("create");
  const [editingSite, setEditingSite] = useState<Site | null>(null);

  // View Mode State
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  // Log Dialog State
  const [logOpen, setLogOpen] = useState(false);
  const [viewingLogSite, setViewingLogSite] = useState<Site | null>(null);

  // Report Dialog State
  const [reportOpen, setReportOpen] = useState(false);
  const [reportingSite, setReportingSite] = useState<Site | null>(null);

  // 仅在客户端读取本地偏好
  useEffect(() => {
    setLoading(true);
    const prefs = userPreferenceService.getPreferences();
    setFavorites(prefs.favoriteSites);
    setHidden(prefs.hiddenSites);
    setLoading(false);
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/api/ld/user", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (active && data?.username) {
          setCurrentUser(data as LdUser);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const canManageSites = (currentUser?.trust_level ?? 0) >= 2;
  const normalizedUsername = currentUser?.username?.toLowerCase() || "";
  const isSiteMaintainer = (site: Site) =>
    normalizedUsername
      ? site.maintainers.some(
          (maintainer) =>
            maintainer.id && maintainer.id.toLowerCase() === normalizedUsername
        )
      : false;

  const filteredSites = useMemo(() => {
    const visibleSites = sites.filter(
      (site) => site.isVisible !== false || isSiteMaintainer(site)
    );
    const filters: FilterOptions = {
      searchKeyword: searchQuery,
      tags: selectedTag !== "all" ? [selectedTag] : undefined,
      registrationLimit:
        selectedRegistrationLimit === "all"
          ? "all"
          : Number(selectedRegistrationLimit),
      feature: selectedFeature === "all" ? "all" : selectedFeature,
      showHidden,
    };

    const userPrefs = { favoriteSites: favorites, hiddenSites: hidden };
    const filtered = filterService.filterSites(
      visibleSites,
      filters,
      userPrefs
    );
    return filterService.sortSites(filtered, "smart", favorites);
  }, [
    sites,
    searchQuery,
    selectedTag,
    selectedRegistrationLimit,
    selectedFeature,
    showHidden,
    favorites,
    hidden,
    normalizedUsername,
  ]);

  const handleToggleFavorite = (siteId: string) => {
    if (favorites.includes(siteId)) {
      userPreferenceService.unfavoriteSite(siteId);
      setFavorites(favorites.filter((id) => id !== siteId));
    } else {
      userPreferenceService.favoriteSite(siteId);
      setFavorites([...favorites, siteId]);
    }
  };

  const handleToggleHidden = (siteId: string) => {
    if (hidden.includes(siteId)) {
      userPreferenceService.unhideSite(siteId);
      setHidden(hidden.filter((id) => id !== siteId));
    } else {
      userPreferenceService.hideSite(siteId);
      setHidden([...hidden, siteId]);
    }
  };

  const handleOpenCreate = () => {
    setEditorMode("create");
    setEditingSite(null);
    setEditorOpen(true);
  };

  const handleOpenEdit = (site: Site) => {
    setEditorMode("edit");
    setEditingSite(site);
    setEditorOpen(true);
  };

  const handleViewLogs = (site: Site) => {
    setViewingLogSite(site);
    setLogOpen(true);
  };

  const handleReport = (site: Site) => {
    setReportingSite(site);
    setReportOpen(true);
  };

  const handleReportSubmitted = () => {
    if (reportingSite) {
      userPreferenceService.hideSite(reportingSite.id);
      setHidden([...hidden, reportingSite.id]);
    }
    setReportOpen(false);
    setReportingSite(null);
    mutate();
  };

  const handleSubmit = async (payload: Record<string, unknown>) => {
    const nextPayload = { ...payload };
    if (editorMode === "edit" && editingSite) {
      if (!isSiteMaintainer(editingSite)) {
        delete (nextPayload as { isVisible?: boolean }).isVisible;
        delete (nextPayload as { description?: string }).description;
      }
    }
    const response = await fetch(
      editorMode === "create" ? "/api/sites" : `/api/sites/${editingSite?.id}`,
      {
        method: editorMode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nextPayload),
      }
    );
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));

      // 根据 HTTP 状态码提供友好的错误提示
      if (response.status === 400) {
        throw new Error(data.error || "URL 格式无效，请检查输入");
      }
      if (response.status === 401) {
        throw new Error("未登录，请先登录");
      }
      if (response.status === 403) {
        // 使用错误码判断，而非字符串匹配
        switch (data.code) {
          case API_ERROR_CODES.DESCRIPTION_PERMISSION_DENIED:
            throw new Error("权限不足，仅站长可以修改站点描述");
          case API_ERROR_CODES.VISIBILITY_PERMISSION_DENIED:
            throw new Error("权限不足，仅站长可以修改站点可见性");
          default:
            throw new Error(data.error || "权限不足，需要 Trust Level 2 以上");
        }
      }
      if (response.status === 409) {
        // URL 冲突错误，显示冲突站点信息
        if (data.conflictingSite) {
          throw new Error(
            `API Base URL 已被站点 "${data.conflictingSite.name}" 使用`
          );
        }
        throw new Error(data.error || "API Base URL 已存在");
      }
      if (response.status === 500) {
        throw new Error("服务器错误，请稍后重试");
      }

      throw new Error(data.error || "保存失败");
    }
    await mutate(); // Revalidate SWR data
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <Loader2 className="h-8 w-8 animate-spin text-brand-blue" />
          <p className="text-brand-muted text-sm">
            Loading public AI API directory...
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <>
      <Background />
      <Navigation username={currentUser?.username} />

      <motion.header
        className="mx-auto max-w-7xl px-4 pt-12 pb-8 sm:px-6 lg:px-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="max-w-3xl">
          <h1 className="text-3xl font-bold tracking-tight text-brand-text sm:text-4xl">
            我为人人，人人为我
          </h1>
          <p className="mt-4 text-lg text-brand-muted leading-7">
            汇聚社区精选资源，共建共享优质生态。
            <br className="hidden sm:inline" />
            请珍视站长成果，
            <span className="text-red-500/80 font-medium">严禁对外分享</span>。
            LV2 及以上用户可参与编辑维护，共同打造更好的 Linux Do 生态。
          </p>
        </div>

        {dataWarning && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            {dataWarning}
          </div>
        )}

        <FilterBar
          tags={tagOptions}
          selectedTag={selectedTag}
          selectedRegistrationLimit={selectedRegistrationLimit}
          selectedFeature={selectedFeature}
          searchQuery={searchQuery}
          totalCount={filteredSites.length}
          showHidden={showHidden}
          canCreate={canManageSites}
          viewMode={viewMode}
          onTagChange={setSelectedTag}
          onRegistrationLimitChange={setSelectedRegistrationLimit}
          onFeatureChange={setSelectedFeature}
          onSearchChange={setSearchQuery}
          onToggleShowHidden={() => setShowHidden(!showHidden)}
          onCreate={handleOpenCreate}
          onViewModeChange={setViewMode}
        />
      </motion.header>

      <main className="mx-auto max-w-7xl px-4 pb-24 sm:px-6 lg:px-8">
        <AnimatePresence mode="popLayout">
          <motion.div
            className={
              viewMode === "grid"
                ? "grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
                : "flex flex-col gap-4"
            }
            layout
          >
            {filteredSites.map((site) => (
              <SiteCard
                key={`${site.id}-${viewMode}`}
                site={site}
                isFavorite={favorites.includes(site.id)}
                isHidden={hidden.includes(site.id)}
                canEdit={canManageSites}
                variant={viewMode}
                onEdit={handleOpenEdit}
                onViewLogs={handleViewLogs}
                onToggleFavorite={handleToggleFavorite}
                onToggleHidden={handleToggleHidden}
                onReport={handleReport}
              />
            ))}
          </motion.div>
        </AnimatePresence>

        {filteredSites.length === 0 && (
          <motion.div
            className="text-center py-12"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <p className="text-brand-muted">No matching sites found</p>
            <p className="text-sm text-brand-muted/70 mt-2">
              Try adjusting your filters or search query
            </p>
          </motion.div>
        )}
      </main>

      <SiteEditorDialog
        open={editorOpen}
        mode={editorMode}
        site={editingSite}
        tags={tagOptions}
        canEditVisibility={
          editorMode === "edit" && editingSite
            ? isSiteMaintainer(editingSite)
            : false
        }
        canEditDescription={
          editorMode === "edit" && editingSite
            ? isSiteMaintainer(editingSite)
            : false
        }
        onClose={() => setEditorOpen(false)}
        onSubmit={handleSubmit}
      />

      {viewingLogSite && (
        <SiteLogDialog
          open={logOpen}
          siteId={viewingLogSite.id}
          siteName={viewingLogSite.name}
          onClose={() => setLogOpen(false)}
        />
      )}

      {reportingSite && (
        <SiteReportDialog
          open={reportOpen}
          siteId={reportingSite.id}
          siteName={reportingSite.name}
          onClose={() => {
            setReportOpen(false);
            setReportingSite(null);
          }}
          onSubmitted={handleReportSubmitted}
        />
      )}
    </>
  );
}
