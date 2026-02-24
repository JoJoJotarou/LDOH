"use client";

import { useState } from "react";
import useSWR from "swr";
import { Trash2, Plus, Pencil, X, Check, Loader2 } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type NotifRow = {
  id: string;
  title: string;
  content: string;
  is_active: boolean;
  valid_from: string;
  valid_until: string | null;
  min_trust_level: number | null;
  created_at: string;
};

type FormState = {
  title: string;
  content: string;
  valid_from: string;
  valid_until: string;
  min_trust_level: string;
  is_active: boolean;
};

const emptyForm: FormState = {
  title: "",
  content: "",
  valid_from: "",
  valid_until: "",
  min_trust_level: "",
  is_active: true,
};

export default function AdminNotificationsPage() {
  const { data, isLoading, mutate } = useSWR<{ notifications: NotifRow[] }>(
    "/api/admin/notifications",
    fetcher
  );

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...emptyForm, valid_from: new Date().toISOString().slice(0, 16) });
    setShowForm(true);
  };

  const openEdit = (n: NotifRow) => {
    setEditingId(n.id);
    setForm({
      title: n.title,
      content: n.content,
      valid_from: n.valid_from ? n.valid_from.slice(0, 16) : "",
      valid_until: n.valid_until ? n.valid_until.slice(0, 16) : "",
      min_trust_level: n.min_trust_level != null ? String(n.min_trust_level) : "",
      is_active: n.is_active,
    });
    setShowForm(true);
  };

  const save = async () => {
    if (!form.title.trim() || !form.content.trim()) return;
    const actionText = editingId ? "更新" : "创建";
    if (!confirm(`确定要${actionText}该通知吗？`)) return;
    setSaving(true);
    setMessage("");

    const payload = {
      title: form.title,
      content: form.content,
      valid_from: form.valid_from ? new Date(form.valid_from).toISOString() : new Date().toISOString(),
      valid_until: form.valid_until ? new Date(form.valid_until).toISOString() : null,
      min_trust_level: form.min_trust_level ? Number(form.min_trust_level) : null,
      is_active: form.is_active,
    };

    const res = editingId
      ? await fetch(`/api/admin/notifications/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      : await fetch("/api/admin/notifications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

    if (!res.ok) {
      setSaving(false);
      setMessage(editingId ? "更新失败" : "创建失败");
      return;
    }

    setSaving(false);
    setShowForm(false);
    setMessage(editingId ? "更新成功" : "创建成功");
    mutate();
  };

  const deleteNotif = async (id: string) => {
    if (!confirm("确定要删除该通知吗？")) return;
    const actionKey = `${id}:delete`;
    setPendingAction(actionKey);
    try {
      const res = await fetch(`/api/admin/notifications/${id}`, { method: "DELETE" });
      if (!res.ok) {
        alert("删除通知失败");
        return;
      }
      mutate();
    } finally {
      setPendingAction(null);
    }
  };

  const toggleActive = async (n: NotifRow) => {
    const actionLabel = n.is_active ? "禁用" : "启用";
    if (!confirm(`确定要${actionLabel}通知「${n.title}」吗？`)) return;
    const actionKey = `${n.id}:toggle`;
    setPendingAction(actionKey);
    try {
      const res = await fetch(`/api/admin/notifications/${n.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !n.is_active }),
      });
      if (!res.ok) {
        alert("更新通知状态失败");
        return;
      }
      mutate();
    } finally {
      setPendingAction(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-neutral-900">通知管理</h1>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-800"
        >
          <Plus size={15} />
          新建通知
        </button>
      </div>
      {message && (
        <p
          className={`text-sm ${
            message.includes("成功") ? "text-green-600" : "text-red-500"
          }`}
        >
          {message}
        </p>
      )}

      {showForm && (
        <div className="rounded-xl border border-neutral-200 bg-white p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-neutral-700">
              {editingId ? "编辑通知" : "新建通知"}
            </h2>
            <button
              onClick={() => setShowForm(false)}
              className="rounded p-1 text-neutral-400 hover:text-neutral-600"
            >
              <X size={16} />
            </button>
          </div>
          <input
            placeholder="标题"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-400"
          />
          <textarea
            placeholder="内容（支持 Markdown）"
            value={form.content}
            onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
            rows={3}
            className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-400"
          />
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block text-xs text-neutral-500">
                生效时间
              </label>
              <input
                type="datetime-local"
                value={form.valid_from}
                onChange={(e) =>
                  setForm((f) => ({ ...f, valid_from: e.target.value }))
                }
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-neutral-500">
                过期时间（可选）
              </label>
              <input
                type="datetime-local"
                value={form.valid_until}
                onChange={(e) =>
                  setForm((f) => ({ ...f, valid_until: e.target.value }))
                }
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-neutral-500">
                最低信任等级（可选）
              </label>
              <input
                type="number"
                value={form.min_trust_level}
                onChange={(e) =>
                  setForm((f) => ({ ...f, min_trust_level: e.target.value }))
                }
                placeholder="留空不限制"
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none"
              />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-neutral-600">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) =>
                  setForm((f) => ({ ...f, is_active: e.target.checked }))
                }
              />
              启用
            </label>
            <button
              onClick={save}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-800 disabled:opacity-50"
            >
              {saving ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Check size={15} />
              )}
              保存
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-100 text-left text-xs text-neutral-500">
              <th className="px-4 py-3 font-medium">标题</th>
              <th className="px-4 py-3 font-medium">状态</th>
              <th className="px-4 py-3 font-medium">生效时间</th>
              <th className="px-4 py-3 font-medium">过期时间</th>
              <th className="px-4 py-3 font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-neutral-400">
                  加载中...
                </td>
              </tr>
            ) : !data?.notifications.length ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-neutral-400">
                  暂无通知
                </td>
              </tr>
            ) : (
              data.notifications.map((n) => {
                const rowPending = pendingAction?.startsWith(`${n.id}:`) ?? false;
                const togglePending = pendingAction === `${n.id}:toggle`;
                const deletePending = pendingAction === `${n.id}:delete`;
                return (
                <tr key={n.id} className="border-b border-neutral-50">
                  <td className="px-4 py-3 text-neutral-700">{n.title}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleActive(n)}
                      disabled={rowPending}
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        n.is_active
                          ? "bg-green-100 text-green-700"
                          : "bg-neutral-100 text-neutral-500"
                      } disabled:cursor-not-allowed disabled:opacity-60`}
                    >
                      {togglePending ? "处理中..." : n.is_active ? "启用" : "禁用"}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-xs text-neutral-400">
                    {n.valid_from
                      ? new Date(n.valid_from).toLocaleString("zh-CN")
                      : "-"}
                  </td>
                  <td className="px-4 py-3 text-xs text-neutral-400">
                    {n.valid_until
                      ? new Date(n.valid_until).toLocaleString("zh-CN")
                      : "永久"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button
                        onClick={() => openEdit(n)}
                        disabled={rowPending}
                        title="编辑"
                        className="rounded p-1.5 text-neutral-500 hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => deleteNotif(n.id)}
                        disabled={rowPending}
                        title="删除"
                        className="rounded p-1.5 text-red-500 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {deletePending ? (
                          <Loader2 size={15} className="animate-spin" />
                        ) : (
                          <Trash2 size={15} />
                        )}
                      </button>
                    </div>
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
