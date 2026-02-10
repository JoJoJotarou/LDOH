"use client";

import { useState } from "react";
import useSWR from "swr";
import { LogOut, ChevronLeft, ChevronRight } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type UserRow = {
  sessionId: string;
  userId: number;
  username: string | null;
  trustLevel: number | null;
  lastSeen: string | null;
  sessionExpiresAt: string;
  createdAt: string;
};

type UsersResponse = {
  users: UserRow[];
  total: number;
  page: number;
  pageSize: number;
};

export default function AdminUsersPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading, mutate } = useSWR<UsersResponse>(
    `/api/admin/users?page=${page}`,
    fetcher
  );

  const forceLogout = async (userId: number, username: string | null) => {
    if (!confirm(`确定要强制下线用户「${username || userId}」吗？`)) return;
    await fetch(`/api/admin/users/${userId}/sessions`, { method: "DELETE" });
    mutate();
  };

  const totalPages = data ? Math.ceil(data.total / data.pageSize) : 0;

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold text-neutral-900">用户管理</h1>

      <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-100 text-left text-xs text-neutral-500">
              <th className="px-4 py-3 font-medium">用户 ID</th>
              <th className="px-4 py-3 font-medium">用户名</th>
              <th className="px-4 py-3 font-medium">Trust Level</th>
              <th className="px-4 py-3 font-medium">登录时间</th>
              <th className="px-4 py-3 font-medium">会话过期</th>
              <th className="px-4 py-3 font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-neutral-400">
                  加载中...
                </td>
              </tr>
            ) : !data?.users.length ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-neutral-400">
                  暂无数据
                </td>
              </tr>
            ) : (
              data.users.map((user) => (
                <tr key={user.sessionId} className="border-b border-neutral-50">
                  <td className="px-4 py-3 text-neutral-700">{user.userId}</td>
                  <td className="px-4 py-3">{user.username || "-"}</td>
                  <td className="px-4 py-3 text-neutral-500">
                    {user.trustLevel ?? "-"}
                  </td>
                  <td className="px-4 py-3 text-xs text-neutral-400">
                    {user.createdAt
                      ? new Date(user.createdAt).toLocaleString("zh-CN")
                      : "-"}
                  </td>
                  <td className="px-4 py-3 text-xs text-neutral-400">
                    {user.sessionExpiresAt
                      ? new Date(user.sessionExpiresAt).toLocaleString("zh-CN")
                      : "-"}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => forceLogout(user.userId, user.username)}
                      title="强制下线"
                      className="rounded p-1.5 text-red-500 hover:bg-red-50"
                    >
                      <LogOut size={15} />
                    </button>
                  </td>
                </tr>
              ))
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
