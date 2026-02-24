"use client";

import { useState, useCallback } from "react";
import useSWR from "swr";
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
  Loader2,
} from "lucide-react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type ReportRow = {
  id: string;
  site_id: string;
  site_name: string;
  reporter_id: number;
  reporter_username: string;
  report_type: "runaway" | "fake_charity";
  reason: string;
  status: string;
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: number | null;
};

type ReportsResponse = {
  items: ReportRow[];
  total: number;
  page: number;
  pageSize: number;
};

const STATUS_TABS = [
  { value: "", label: "全部" },
  { value: "pending", label: "待处理" },
  { value: "reviewed", label: "已处理" },
  { value: "dismissed", label: "已驳回" },
];

const STATUS_BADGE: Record<string, { className: string; label: string }> = {
  pending: {
    className: "bg-amber-100 text-amber-700",
    label: "待处理",
  },
  reviewed: {
    className: "bg-green-100 text-green-700",
    label: "已处理",
  },
  dismissed: {
    className: "bg-neutral-100 text-neutral-500",
    label: "已驳回",
  },
};

const TYPE_BADGE: Record<ReportRow["report_type"], { className: string; label: string }> = {
  runaway: {
    className: "bg-red-100 text-red-700",
    label: "跑路",
  },
  fake_charity: {
    className: "bg-amber-100 text-amber-700",
    label: "伪公益",
  },
};

export default function AdminReportsPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  const queryParams = new URLSearchParams();
  queryParams.set("page", String(page));
  if (statusFilter) queryParams.set("status", statusFilter);

  const { data, isLoading, mutate } = useSWR<ReportsResponse>(
    `/api/admin/reports?${queryParams}`,
    fetcher
  );

  const handleStatusChange = useCallback((status: string) => {
    setStatusFilter(status);
    setPage(1);
  }, []);

  const handleAction = async (reportId: string, action: "reviewed" | "dismissed") => {
    const confirmText =
      action === "reviewed"
        ? "确认处理后将应用该报告标记并下线站点，是否继续？"
        : "确认驳回该报告吗？";
    if (!confirm(confirmText)) return;
    const actionKey = `${reportId}:${action}`;
    setPendingAction(actionKey);
    try {
      const res = await fetch(`/api/admin/reports/${reportId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: action }),
      });
      if (!res.ok) {
        alert("更新报告状态失败");
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
      <h1 className="text-lg font-semibold text-neutral-900">报告管理</h1>

      <div className="flex gap-1">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => handleStatusChange(tab.value)}
            className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
              statusFilter === tab.value
                ? "bg-neutral-900 text-white"
                : "text-neutral-600 hover:bg-neutral-100"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-100 text-left text-xs text-neutral-500">
              <th className="px-4 py-3 font-medium">站点名称</th>
              <th className="px-4 py-3 font-medium">报告人</th>
              <th className="px-4 py-3 font-medium">类型</th>
              <th className="px-4 py-3 font-medium">报告原因</th>
              <th className="px-4 py-3 font-medium">报告时间</th>
              <th className="px-4 py-3 font-medium">状态</th>
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
            ) : !data?.items?.length ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-8 text-center text-neutral-400"
                >
                  暂无数据
                </td>
              </tr>
            ) : (
              data.items.map((report) => {
                const badge = STATUS_BADGE[report.status] ?? STATUS_BADGE.pending;
                const typeBadge = TYPE_BADGE[report.report_type];
                const rowPending = pendingAction?.startsWith(`${report.id}:`) ?? false;
                const reviewedPending = pendingAction === `${report.id}:reviewed`;
                const dismissedPending = pendingAction === `${report.id}:dismissed`;
                return (
                  <tr
                    key={report.id}
                    className="border-b border-neutral-50"
                  >
                    <td className="px-4 py-3">{report.site_name}</td>
                    <td className="px-4 py-3 text-neutral-500">
                      {report.reporter_username || `#${report.reporter_id}`}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${typeBadge.className}`}
                      >
                        {typeBadge.label}
                      </span>
                    </td>
                    <td className="max-w-[300px] truncate px-4 py-3 text-neutral-500">
                      {report.reason}
                    </td>
                    <td className="px-4 py-3 text-xs text-neutral-400">
                      {report.created_at
                        ? new Date(report.created_at).toLocaleString("zh-CN")
                        : "-"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${badge.className}`}
                      >
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {report.status === "pending" ? (
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleAction(report.id, "reviewed")}
                            disabled={rowPending}
                            title={`确认处理（保持${typeBadge.label}标记）`}
                            className="rounded p-1.5 text-green-600 hover:bg-green-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {reviewedPending ? (
                              <Loader2 size={15} className="animate-spin" />
                            ) : (
                              <CheckCircle size={15} />
                            )}
                          </button>
                          <button
                            onClick={() => handleAction(report.id, "dismissed")}
                            disabled={rowPending}
                            title={`驳回（移除${typeBadge.label}标记）`}
                            className="rounded p-1.5 text-neutral-500 hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {dismissedPending ? (
                              <Loader2 size={15} className="animate-spin" />
                            ) : (
                              <XCircle size={15} />
                            )}
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-neutral-400">-</span>
                      )}
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
