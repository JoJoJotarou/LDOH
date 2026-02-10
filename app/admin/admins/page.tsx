"use client";

import { useState } from "react";
import useSWR from "swr";
import { Trash2, Plus } from "lucide-react";

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
  const [error, setError] = useState("");

  const addAdmin = async () => {
    setError("");
    if (!newUserId.trim()) {
      setError("请输入用户 ID");
      return;
    }
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
    const res = await fetch(`/api/admin/admins/${admin.id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const body = await res.json();
      alert(body.error || "移除失败");
    } else {
      mutate();
    }
  };

  const changeRole = async (admin: AdminRow, role: string) => {
    await fetch(`/api/admin/admins/${admin.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    mutate();
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
          <Plus size={15} />
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
              data.admins.map((admin) => (
                <tr key={admin.id} className="border-b border-neutral-50">
                  <td className="px-4 py-3 text-neutral-700">
                    {admin.user_id}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={admin.role}
                      onChange={(e) => changeRole(admin, e.target.value)}
                      className="rounded border border-neutral-200 px-2 py-1 text-xs outline-none"
                    >
                      <option value="admin">admin</option>
                      <option value="super_admin">super_admin</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 text-xs text-neutral-400">
                    {admin.created_at
                      ? new Date(admin.created_at).toLocaleString("zh-CN")
                      : "-"}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => removeAdmin(admin)}
                      title="移除"
                      className="rounded p-1.5 text-red-500 hover:bg-red-50"
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
