"use client";

import { useState, useCallback } from "react";
import useSWR from "swr";
import {
  Power,
  PowerOff,
  RotateCcw,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

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
  const [page, setPage] = useState(1);

  const queryParams = new URLSearchParams();
  queryParams.set("page", String(page));
  if (search) queryParams.set("search", search);

  const { data, isLoading, mutate } = useSWR<SitesResponse>(
    `/api/admin/sites?${queryParams}`,
    fetcher
  );

  const handleSearch = useCallback(() => {
    setSearch(searchInput);
    setPage(1);
  }, [searchInput]);

  const toggleVisibility = async (site: SiteRow) => {
    await fetch(`/api/admin/sites/${site.id}/visibility`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !site.is_active }),
    });
    mutate();
  };

  const restoreRunaway = async (site: SiteRow) => {
    await fetch(`/api/admin/sites/${site.id}/runaway`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_runaway: false }),
    });
    mutate();
  };

  const restoreFakeCharity = async (site: SiteRow) => {
    await fetch(`/api/admin/sites/${site.id}/fake-charity`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_fake_charity: false }),
    });
    mutate();
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
                  colSpan={6}
                  className="px-4 py-8 text-center text-neutral-400"
                >
                  加载中...
                </td>
              </tr>
            ) : !(data?.sites?.length) ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-neutral-400"
                >
                  暂无数据
                </td>
              </tr>
            ) : (
              data.sites.map((site) => {
                return (
                  <tr key={site.id} className="border-b border-neutral-50">
                    <td className="px-4 py-3">
                      {site.name}
                    </td>
                    <td className="max-w-[200px] truncate px-4 py-3 text-neutral-500">
                      {site.api_base_url}
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
                          title={site.is_active ? "下线站点" : "上线站点"}
                          className="rounded p-1.5 text-neutral-500 hover:bg-neutral-100"
                        >
                          {site.is_active ? (
                            <PowerOff size={15} />
                          ) : (
                            <Power size={15} />
                          )}
                        </button>
                        {site.is_runaway && (
                          <button
                            onClick={() => restoreRunaway(site)}
                            title="恢复跑路并上线"
                            className="rounded p-1.5 text-red-600 hover:bg-red-50"
                          >
                            <RotateCcw size={15} />
                          </button>
                        )}
                        {site.is_fake_charity && (
                          <button
                            onClick={() => restoreFakeCharity(site)}
                            title="恢复伪公益并上线"
                            className="rounded p-1.5 text-orange-600 hover:bg-orange-50"
                          >
                            <RotateCcw size={15} />
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
