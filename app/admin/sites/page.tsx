"use client";

import { useState, useCallback } from "react";
import useSWR from "swr";
import {
  Eye,
  EyeOff,
  Trash2,
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
  is_visible: boolean | null;
  is_active: boolean | null;
  deleted_at: string | null;
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

  const deleteSite = async (site: SiteRow) => {
    if (!confirm(`确定要删除站点「${site.name}」吗？（可恢复）`)) return;
    await fetch(`/api/admin/sites/${site.id}`, { method: "DELETE" });
    mutate();
  };

  const restoreSite = async (site: SiteRow) => {
    await fetch(`/api/admin/sites/${site.id}/restore`, { method: "PATCH" });
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
            ) : !data?.sites.length ? (
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
                const isDeleted = Boolean(site.deleted_at);
                return (
                  <tr
                    key={site.id}
                    className={`border-b border-neutral-50 ${
                      isDeleted ? "bg-red-50/50 opacity-60" : ""
                    }`}
                  >
                    <td className="px-4 py-3">
                      <span
                        className={isDeleted ? "line-through" : ""}
                      >
                        {site.name}
                      </span>
                    </td>
                    <td className="max-w-[200px] truncate px-4 py-3 text-neutral-500">
                      {site.api_base_url}
                    </td>
                    <td className="px-4 py-3 text-neutral-500">
                      {site.registration_limit ?? "-"}
                    </td>
                    <td className="px-4 py-3">
                      {isDeleted ? (
                        <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">
                          已删除
                        </span>
                      ) : site.is_active ? (
                        <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">
                          显示中
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
                          已隐藏
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-neutral-400">
                      {site.updated_at
                        ? new Date(site.updated_at).toLocaleString("zh-CN")
                        : "-"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {isDeleted ? (
                          <button
                            onClick={() => restoreSite(site)}
                            title="恢复"
                            className="rounded p-1.5 text-green-600 hover:bg-green-50"
                          >
                            <RotateCcw size={15} />
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={() => toggleVisibility(site)}
                              title={
                                site.is_active ? "隐藏站点" : "显示站点"
                              }
                              className="rounded p-1.5 text-neutral-500 hover:bg-neutral-100"
                            >
                              {site.is_active ? (
                                <EyeOff size={15} />
                              ) : (
                                <Eye size={15} />
                              )}
                            </button>
                            <button
                              onClick={() => deleteSite(site)}
                              title="删除"
                              className="rounded p-1.5 text-red-500 hover:bg-red-50"
                            >
                              <Trash2 size={15} />
                            </button>
                          </>
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
