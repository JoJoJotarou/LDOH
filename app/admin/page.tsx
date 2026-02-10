"use client";

import useSWR from "swr";
import { Globe, Eye, EyeOff, Trash2, Activity } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type Stats = {
  totalSites: number;
  activeSites: number;
  hiddenSites: number;
  deletedSites: number;
  health: { up: number; slow: number; down: number };
  recentSessions: { userId: number; username: string; createdAt: string }[];
};

export default function AdminDashboard() {
  const { data, isLoading } = useSWR<Stats>(
    "/api/admin/dashboard/stats",
    fetcher
  );

  if (isLoading || !data) {
    return (
      <div className="text-sm text-neutral-500">加载统计数据中...</div>
    );
  }

  const statCards = [
    {
      label: "站点总数",
      value: data.totalSites,
      icon: <Globe size={20} className="text-blue-500" />,
    },
    {
      label: "活跃站点",
      value: data.activeSites,
      icon: <Eye size={20} className="text-green-500" />,
    },
    {
      label: "隐藏站点",
      value: data.hiddenSites,
      icon: <EyeOff size={20} className="text-amber-500" />,
    },
    {
      label: "已删除",
      value: data.deletedSites,
      icon: <Trash2 size={20} className="text-red-400" />,
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold text-neutral-900">仪表盘</h1>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-neutral-200 bg-white p-5"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm text-neutral-500">{card.label}</span>
              {card.icon}
            </div>
            <div className="mt-2 text-2xl font-semibold text-neutral-900">
              {card.value}
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-neutral-200 bg-white p-5">
          <h2 className="mb-4 text-sm font-medium text-neutral-700">
            <Activity size={16} className="mr-1.5 inline text-neutral-400" />
            健康状态分布
          </h2>
          <div className="flex gap-6">
            <div>
              <span className="text-2xl font-semibold text-green-600">
                {data.health.up}
              </span>
              <span className="ml-1 text-xs text-neutral-500">正常</span>
            </div>
            <div>
              <span className="text-2xl font-semibold text-amber-500">
                {data.health.slow}
              </span>
              <span className="ml-1 text-xs text-neutral-500">较慢</span>
            </div>
            <div>
              <span className="text-2xl font-semibold text-red-500">
                {data.health.down}
              </span>
              <span className="ml-1 text-xs text-neutral-500">离线</span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-5">
          <h2 className="mb-4 text-sm font-medium text-neutral-700">
            最近登录用户
          </h2>
          {data.recentSessions.length === 0 ? (
            <p className="text-sm text-neutral-400">暂无记录</p>
          ) : (
            <ul className="space-y-2">
              {data.recentSessions.slice(0, 5).map((s, i) => (
                <li
                  key={`${s.userId}-${i}`}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-neutral-700">
                    {s.username || `User#${s.userId}`}
                  </span>
                  <span className="text-xs text-neutral-400">
                    {s.createdAt
                      ? new Date(s.createdAt).toLocaleString("zh-CN")
                      : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
