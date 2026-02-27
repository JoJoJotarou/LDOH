"use client";

import { useState, useCallback } from "react";
import useSWR from "swr";
import {
  Power,
  PowerOff,
  RotateCcw,
  Loader2,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type SiteMaintainer = {
  name: string;
  username: string | null;
  profile_url: string | null;
};

type SiteRow = {
  id: string;
  name: string;
  description: string | null;
  api_base_url: string;
  is_only_maintainer_visible: boolean | null;
  is_active: boolean | null;
  is_runaway: boolean | null;
  is_fake_charity: boolean | null;
  updated_at: string | null;
  registration_limit: number | null;
  site_maintainers: SiteMaintainer[];
};

type SitesResponse = {
  sites: SiteRow[];
  total: number;
  page: number;
  pageSize: number;
};

export default function AdminSitesPage() {
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  const queryParams = new URLSearchParams();
  queryParams.set("page", String(page));
  if (search) queryParams.set("search", search);
  if (status) queryParams.set("status", status);

  const { data, isLoading, mutate } = useSWR<SitesResponse>(
    `/api/admin/sites?${queryParams}`,
    fetcher
  );

  const handleSearch = useCallback(() => {
    setSearch(searchInput);
    setPage(1);
  }, [searchInput]);

  const toggleVisibility = async (site: SiteRow) => {
    const actionLabel = site.is_active ? "下线" : "上线";
    if (!confirm(`确定要${actionLabel}站点「${site.name}」吗？`)) return;
    const actionKey = `${site.id}:visibility`;
    setPendingAction(actionKey);
    try {
      const res = await fetch(`/api/admin/sites/${site.id}/visibility`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !site.is_active }),
      });
      if (!res.ok) {
        alert("更新站点状态失败");
        return;
      }
      mutate();
    } finally {
      setPendingAction(null);
    }
  };

  const restoreRunaway = async (site: SiteRow) => {
    if (!confirm(`确定要恢复跑路站点「${site.name}」并重新上线吗？`)) return;
    const actionKey = `${site.id}:runaway`;
    setPendingAction(actionKey);
    try {
      const res = await fetch(`/api/admin/sites/${site.id}/runaway`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_runaway: false }),
      });
      if (!res.ok) {
        alert("恢复跑路站点失败");
        return;
      }
      mutate();
    } finally {
      setPendingAction(null);
    }
  };

  const restoreFakeCharity = async (site: SiteRow) => {
    if (!confirm(`确定要恢复伪公益站点「${site.name}」并重新上线吗？`)) return;
    const actionKey = `${site.id}:fake_charity`;
    setPendingAction(actionKey);
    try {
      const res = await fetch(`/api/admin/sites/${site.id}/fake-charity`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_fake_charity: false }),
      });
      if (!res.ok) {
        alert("恢复伪公益站点失败");
        return;
      }
      mutate();
    } finally {
      setPendingAction(null);
    }
  };

  const totalPages = data ? Math.ceil(data.total / data.pageSize) : 0;

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold text-neutral-900">站点管理</h1>

      <div className="flex gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
          />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="搜索站点名称或 URL..."
            className="w-full rounded-lg border border-neutral-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-neutral-400"
          />
        </div>
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-400"
        >
          <option value="">全部状态</option>
          <option value="active">已上线</option>
          <option value="inactive">已下线</option>
          <option value="runaway">跑路</option>
          <option value="fake_charity">伪公益</option>
        </select>
        <button
          onClick={handleSearch}
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-800"
        >
          搜索
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-100 text-left text-xs text-neutral-500">
              <th className="px-4 py-3 font-medium">站点名称</th>
              <th className="px-4 py-3 font-medium">API Base URL</th>
              <th className="px-4 py-3 font-medium">维护者</th>
              <th className="px-4 py-3 font-medium">等级</th>
              <th className="px-4 py-3 font-medium">状态</th>
              <th className="px-4 py-3 font-medium">更新时间</th>
              <th className="px-4 py-3 font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-8 text-center text-neutral-400"
                >
                  加载中...
                </td>
              </tr>
            ) : !(data?.sites?.length) ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-8 text-center text-neutral-400"
                >
                  暂无数据
                </td>
              </tr>
            ) : (
              data.sites.map((site) => {
                const rowPending = pendingAction?.startsWith(`${site.id}:`) ?? false;
                const visibilityPending = pendingAction === `${site.id}:visibility`;
                const runawayPending = pendingAction === `${site.id}:runaway`;
                const fakeCharityPending = pendingAction === `${site.id}:fake_charity`;
                return (
                  <tr key={site.id} className="border-b border-neutral-50">
                    <td className="px-4 py-3">
                      {site.name}
                    </td>
                    <td className="max-w-[200px] truncate px-4 py-3 text-neutral-500">
                      {site.api_base_url}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {site.site_maintainers?.length ? (
                          site.site_maintainers.map((m, i) =>
                            m.profile_url ? (
                              <a
                                key={i}
                                href={m.profile_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700 hover:bg-blue-100 transition-colors"
                              >
                                {m.name}
                              </a>
                            ) : (
                              <span
                                key={i}
                                className="inline-flex items-center rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600"
                              >
                                {m.name}
                              </span>
                            )
                          )
                        ) : (
                          <span className="text-neutral-300">-</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-neutral-500">
                      {site.registration_limit ?? "-"}
                    </td>
                    <td className="px-4 py-3">
                      {site.is_active ? (
                        <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">
                          已上线
                        </span>
                      ) : (
                        <div className="flex flex-wrap items-center gap-1">
                          <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
                            已下线
                          </span>
                          {site.is_runaway && (
                            <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">
                              跑路
                            </span>
                          )}
                          {site.is_fake_charity && (
                            <span className="inline-flex items-center rounded-full bg-orange-100 px-2 py-0.5 text-xs text-orange-700">
                              伪公益
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-neutral-400">
                      {site.updated_at
                        ? new Date(site.updated_at).toLocaleString("zh-CN")
                        : "-"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button
                          onClick={() => toggleVisibility(site)}
                          disabled={rowPending}
                          title={site.is_active ? "下线站点" : "上线站点"}
                          className="rounded p-1.5 text-neutral-500 hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {visibilityPending ? (
                            <Loader2 size={15} className="animate-spin" />
                          ) : site.is_active ? (
                            <PowerOff size={15} />
                          ) : (
                            <Power size={15} />
                          )}
                        </button>
                        {site.is_runaway && (
                          <button
                            onClick={() => restoreRunaway(site)}
                            disabled={rowPending}
                            title="恢复跑路并上线"
                            className="rounded p-1.5 text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {runawayPending ? (
                              <Loader2 size={15} className="animate-spin" />
                            ) : (
                              <RotateCcw size={15} />
                            )}
                          </button>
                        )}
                        {site.is_fake_charity && (
                          <button
                            onClick={() => restoreFakeCharity(site)}
                            disabled={rowPending}
                            title="恢复伪公益并上线"
                            className="rounded p-1.5 text-orange-600 hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {fakeCharityPending ? (
                              <Loader2 size={15} className="animate-spin" />
                            ) : (
                              <RotateCcw size={15} />
                            )}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-neutral-500">
            共 {data?.total ?? 0} 条，第 {page}/{totalPages} 页
          </span>
          <div className="flex gap-1">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-lg border border-neutral-200 p-2 disabled:opacity-40"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg border border-neutral-200 p-2 disabled:opacity-40"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
