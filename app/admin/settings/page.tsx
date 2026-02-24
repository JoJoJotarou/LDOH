"use client";

import { useState } from "react";
import useSWR from "swr";
import { Save } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function AdminSettingsPage() {
  const { data, isLoading, mutate } = useSWR<{
    settings: Record<string, string>;
  }>("/api/admin/settings", fetcher);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [form, setForm] = useState<Record<string, string>>({});
  const merged = { ...data?.settings, ...form };

  const handleChange = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (Object.keys(form).length === 0) return;
    if (!confirm("确定要保存系统配置变更吗？")) return;
    setSaving(true);
    setMessage("");

    const res = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (res.ok) {
      setMessage("保存成功");
      setForm({});
      mutate();
    } else {
      setMessage("保存失败");
    }
    setSaving(false);
  };

  // 预定义的配置项
  const settingsConfig = [
    {
      key: "site_default_registration_limit",
      label: "站点默认登记等级",
      description: "新建站点的默认 registration_limit 值",
      type: "number" as const,
    },
    {
      key: "min_trust_level_create",
      label: "创建站点最低信任等级",
      description: "用户需达到此 trust_level 才可创建站点",
      type: "number" as const,
    },
    {
      key: "min_trust_level_edit",
      label: "编辑站点最低信任等级",
      description: "用户需达到此 trust_level 才可编辑站点",
      type: "number" as const,
    },
  ];

  if (isLoading) {
    return <div className="text-sm text-neutral-500">加载配置中...</div>;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold text-neutral-900">系统配置</h1>

      <div className="space-y-4 rounded-xl border border-neutral-200 bg-white p-5">
        {settingsConfig.map((cfg) => (
          <div key={cfg.key}>
            <label className="mb-1 block text-sm font-medium text-neutral-700">
              {cfg.label}
            </label>
            <p className="mb-2 text-xs text-neutral-400">{cfg.description}</p>
            <input
              type={cfg.type}
              value={merged[cfg.key] ?? ""}
              onChange={(e) => handleChange(cfg.key, e.target.value)}
              className="w-64 rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-400"
            />
          </div>
        ))}

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={handleSave}
            disabled={saving || Object.keys(form).length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-800 disabled:opacity-50"
          >
            <Save size={15} />
            保存配置
          </button>
          {message && (
            <span
              className={`text-sm ${
                message === "保存成功" ? "text-green-600" : "text-red-500"
              }`}
            >
              {message}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
