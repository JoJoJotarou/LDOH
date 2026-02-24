"use client";

import { useState } from "react";
import useSWR from "swr";
import { Trash2, Plus, Loader2 } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type AdminRow = {
  id: string;
  user_id: number;
  role: string;
  created_at: string;
};

export default function AdminAdminsPage() {
  const { data, isLoading, mutate } = useSWR<{ admins: AdminRow[] }>(
    "/api/admin/admins",
    fetcher
  );

  const [newUserId, setNewUserId] = useState("");
  const [newRole, setNewRole] = useState("admin");
  const [adding, setAdding] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [error, setError] = useState("");

  const addAdmin = async () => {
    setError("");
    if (!newUserId.trim()) {
      setError("请输入用户 ID");
      return;
    }
    if (!confirm(`确定要添加 user_id=${newUserId} 为管理员吗？`)) return;
    setAdding(true);
    const res = await fetch("/api/admin/admins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: Number(newUserId), role: newRole }),
    });
    if (!res.ok) {
      const body = await res.json();
      setError(body.error || "添加失败");
    } else {
      setNewUserId("");
      mutate();
    }
    setAdding(false);
  };

  const removeAdmin = async (admin: AdminRow) => {
    if (!confirm(`确定要移除管理员 (user_id: ${admin.user_id}) 吗？`)) return;
    const actionKey = `${admin.id}:remove`;
    setPendingAction(actionKey);
    try {
      const res = await fetch(`/api/admin/admins/${admin.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const body = await res.json();
        alert(body.error || "移除失败");
      } else {
        mutate();
      }
    } finally {
      setPendingAction(null);
    }
  };

  const changeRole = async (admin: AdminRow, role: string) => {
    if (admin.role === role) return;
    if (!confirm(`确定将 user_id=${admin.user_id} 的角色从 ${admin.role} 修改为 ${role} 吗？`)) return;
    const actionKey = `${admin.id}:role`;
    setPendingAction(actionKey);
    try {
      const res = await fetch(`/api/admin/admins/${admin.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) {
        const body = await res.json();
        alert(body.error || "更新角色失败");
        return;
      }
      mutate();
    } finally {
      setPendingAction(null);
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold text-neutral-900">管理员管理</h1>

      <div className="flex items-end gap-3 rounded-xl border border-neutral-200 bg-white p-4">
        <div>
          <label className="mb-1 block text-xs text-neutral-500">
            LinuxDo User ID
          </label>
          <input
            type="number"
            value={newUserId}
            onChange={(e) => setNewUserId(e.target.value)}
            placeholder="输入 user_id"
            className="w-40 rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-400"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-neutral-500">角色</label>
          <select
            value={newRole}
            onChange={(e) => setNewRole(e.target.value)}
            className="rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-400"
          >
            <option value="admin">admin</option>
            <option value="super_admin">super_admin</option>
          </select>
        </div>
        <button
          onClick={addAdmin}
          disabled={adding}
          className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-800 disabled:opacity-50"
        >
          {adding ? (
            <Loader2 size={15} className="animate-spin" />
          ) : (
            <Plus size={15} />
          )}
          添加
        </button>
        {error && <span className="text-sm text-red-500">{error}</span>}
      </div>

      <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-100 text-left text-xs text-neutral-500">
              <th className="px-4 py-3 font-medium">User ID</th>
              <th className="px-4 py-3 font-medium">角色</th>
              <th className="px-4 py-3 font-medium">添加时间</th>
              <th className="px-4 py-3 font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-8 text-center text-neutral-400"
                >
                  加载中...
                </td>
              </tr>
            ) : !data?.admins.length ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-8 text-center text-neutral-400"
                >
                  暂无数据
                </td>
              </tr>
            ) : (
              data.admins.map((admin) => {
                const rowPending = pendingAction?.startsWith(`${admin.id}:`) ?? false;
                const rolePending = pendingAction === `${admin.id}:role`;
                const removePending = pendingAction === `${admin.id}:remove`;
                return (
                <tr key={admin.id} className="border-b border-neutral-50">
                  <td className="px-4 py-3 text-neutral-700">
                    {admin.user_id}
                  </td>
                  <td className="px-4 py-3">
                    <div className="inline-flex items-center gap-2">
                      <select
                        value={admin.role}
                        onChange={(e) => changeRole(admin, e.target.value)}
                        disabled={rowPending}
                        className="rounded border border-neutral-200 px-2 py-1 text-xs outline-none disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <option value="admin">admin</option>
                        <option value="super_admin">super_admin</option>
                      </select>
                      {rolePending && (
                        <Loader2 size={13} className="animate-spin text-neutral-400" />
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-neutral-400">
                    {admin.created_at
                      ? new Date(admin.created_at).toLocaleString("zh-CN")
                      : "-"}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => removeAdmin(admin)}
                      disabled={rowPending}
                      title="移除"
                      className="rounded p-1.5 text-red-500 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {removePending ? (
                        <Loader2 size={15} className="animate-spin" />
                      ) : (
                        <Trash2 size={15} />
                      )}
                    </button>
                  </td>
                </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
