"use client";

import {useEffect, useMemo, useState} from "react";
import useSWR from "swr";
import {Background} from "@/components/common/Background";
import {Navigation} from "@/components/common/Navigation";
import {Site} from "@/lib/contracts/types/site";
import {Button} from "@/components/ui/button";
import {SiteCard} from "@/features/sites/components/SiteCard";
import {Loader2, RotateCcw} from "lucide-react";

type LdUser = {
  id: number;
  username: string;
};

type SitesResponse = {
  sites: Site[];
};

const fetcher = (url: string) =>
  fetch(url).then((res) => res.json() as Promise<SitesResponse>);

export function RunawaySitesPage() {
  const { data, mutate, isLoading } = useSWR<SitesResponse>(
    "/api/sites?mode=runaway",
    fetcher
  );
  const [currentUser, setCurrentUser] = useState<LdUser | null>(null);
  const [restoringIds, setRestoringIds] = useState<string[]>([]);

  useEffect(() => {
    let active = true;
    fetch("/api/ld/user", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((user) => {
        if (active && user?.username) {
          setCurrentUser(user as LdUser);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const normalizedUsername = currentUser?.username?.toLowerCase() || "";
  const sites = data?.sites ?? [];

  const maintainerMap = useMemo(() => {
    return new Map(
      sites.map((site) => [
        site.id,
        (site.maintainers ?? []).some((maintainer) => {
          const maintainerId = maintainer.id?.toLowerCase() || "";
          const maintainerUsername = maintainer.username?.toLowerCase() || "";
          return (
            normalizedUsername &&
            (maintainerId === normalizedUsername ||
              maintainerUsername === normalizedUsername)
          );
        }),
      ])
    );
  }, [sites, normalizedUsername]);

  const handleRestore = async (site: Site) => {
    const confirmed = window.confirm(
      `确认恢复站点「${site.name}」吗？\n恢复后该站点将从跑路列表移除。`
    );
    if (!confirmed) return;

    setRestoringIds((prev) => [...prev, site.id]);
    try {
      await fetch(`/api/sites/${site.id}/restore-runaway`, { method: "PATCH" });
      await mutate();
    } finally {
      setRestoringIds((prev) => prev.filter((id) => id !== site.id));
    }
  };

  return (
    <>
      <Background />
      <Navigation username={currentUser?.username} />
      <main className="mx-auto max-w-7xl px-4 pb-20 pt-10 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <h1 className="text-3xl font-bold tracking-tight text-brand-text sm:text-4xl">
            致谢过往，后会无期
          </h1>
          <p className="mt-4 text-lg text-brand-muted leading-7">
            以下站点已不再运营，本页面仅用于展示。
            <br className="hidden sm:inline" />
            站长可自行恢复站点，也可以联系 <a href="https://linux.do/u/jojojotarou/summary" target="_blank" rel="noopener noreferrer" className="text-red-500/80 font-medium">JoJoJotarou</a>、<a href="https://linux.do/u/lsen/summary" target="_blank" rel="noopener noreferrer" className="text-red-500/80 font-medium">阿森</a> 恢复。
          </p>
        </div>

        <div className="mt-8">
        {isLoading ? (
            <div
                className="rounded-xl border border-brand-border bg-white p-6 text-sm text-brand-muted dark:bg-card dark:border-border">
            加载中...
          </div>
        ) : sites.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-brand-muted">No matching sites found</p>
            <p className="mt-2 text-sm text-brand-muted/70">
              当前没有跑路站点
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sites.map((site) => {
              const isMaintainer = maintainerMap.get(site.id) === true;
              const isRestoring = restoringIds.includes(site.id);

              return (
                <div key={site.id} className="relative">
                  {isMaintainer && (
                    <Button
                      size="icon"
                      onClick={() => handleRestore(site)}
                      disabled={isRestoring}
                      title="恢复我的站点"
                      className="absolute right-6 top-6 z-20 h-8 w-8 rounded-full border border-red-200 bg-white text-red-600 shadow-sm transition hover:bg-red-50 hover:text-red-700 dark:bg-card dark:border-red-900/30 dark:text-red-400 dark:hover:bg-red-950"
                    >
                      {isRestoring ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RotateCcw className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                  <div className="pointer-events-none select-none">
                    <SiteCard
                      site={site}
                      isFavorite={false}
                      isHidden={false}
                      canEdit={false}
                      hideActions
                      onEdit={() => {}}
                      onViewLogs={() => {}}
                      onToggleFavorite={() => {}}
                      onToggleHidden={() => {}}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
        </div>
      </main>
    </>
  );
}
