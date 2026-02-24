/**
 * Site Report Dialog - 报告站点弹窗
 */

"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { API_ERROR_CODES } from "@/lib/constants/error-codes";
import { SitePendingReport } from "@/lib/contracts/types/site";

type ReportType = "runaway" | "fake_charity";

type SiteReportDialogProps = {
  open: boolean;
  siteId: string;
  siteName: string;
  onClose: () => void;
  onSubmitted: () => void;
  viewOnly?: boolean;
  pendingReport?: SitePendingReport;
};

export function SiteReportDialog({
  open,
  siteId,
  siteName,
  onClose,
  onSubmitted,
  viewOnly = false,
  pendingReport,
}: SiteReportDialogProps) {
  const [reportType, setReportType] = useState<ReportType>("fake_charity");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    const trimmed = reason.trim();
    if (!trimmed) return;

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/sites/${siteId}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: trimmed, reportType }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.code === API_ERROR_CODES.REPORT_DUPLICATE) {
          setError("你已提交过该类型报告，请勿重复提交");
        } else if (data.code === API_ERROR_CODES.REPORT_PENDING_EXISTS) {
          setError("该类型报告已在处理中，暂不接受新的报告");
        } else if (res.status === 401) {
          setError("请先登录后再报告");
        } else {
          setError(data.error || "提交失败，请稍后重试");
        }
        return;
      }
      setReason("");
      onSubmitted();
    } catch {
      setError("网络错误，请稍后重试");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setReportType("fake_charity");
    setReason("");
    setError(null);
    onClose();
  };

  const reportTypeLabel = pendingReport?.reportType === "runaway" ? "跑路（关站）" : "伪公益站点";

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-4 py-6">
          <motion.div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            aria-hidden="true"
          />
          <motion.div
            className="relative w-full max-w-md rounded-xl border border-brand-border bg-white p-5 shadow-2xl"
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-brand-text">
                  {viewOnly ? "报告详情" : "报告站点"}
                </h3>
                <p className="mt-0.5 text-xs text-brand-muted">
                  {siteName}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClose}
                className="rounded-full hover:bg-slate-100"
              >
                <X className="h-4 w-4 text-slate-500" />
              </Button>
            </div>

            <div className="space-y-3">
              {viewOnly ? (
                <div className="space-y-3 rounded-lg border border-brand-border bg-slate-50 p-3 text-sm text-brand-text">
                  <p>
                    <span className="text-brand-muted">报告类型：</span>
                    {reportTypeLabel}
                  </p>
                  <p>
                    <span className="text-brand-muted">提交人：</span>
                    {pendingReport?.reporterUsername || "未知"}
                  </p>
                  <p>
                    <span className="text-brand-muted">提交时间：</span>
                    {pendingReport?.createdAt
                      ? new Date(pendingReport.createdAt).toLocaleString("zh-CN")
                      : "未知"}
                  </p>
                  <div>
                    <p className="mb-1 text-brand-muted">报告原因：</p>
                    <p className="whitespace-pre-wrap text-xs leading-5">
                      {pendingReport?.reason?.trim() || "暂无详情"}
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <p className="mb-2 text-xs text-brand-muted">报告类型</p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setReportType("runaway")}
                        className={`rounded-lg border px-3 py-2 text-sm ${
                          reportType === "runaway"
                            ? "border-amber-300 bg-amber-50 text-amber-700"
                            : "border-brand-border bg-white text-brand-text"
                        }`}
                      >
                        跑路（关站）
                      </button>
                      <button
                        type="button"
                        onClick={() => setReportType("fake_charity")}
                        className={`rounded-lg border px-3 py-2 text-sm ${
                          reportType === "fake_charity"
                            ? "border-amber-300 bg-amber-50 text-amber-700"
                            : "border-brand-border bg-white text-brand-text"
                        }`}
                      >
                        伪公益站点
                      </button>
                    </div>
                  </div>
                  <div>
                    <textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      maxLength={500}
                      rows={4}
                      placeholder="请描述报告原因..."
                      className="w-full resize-none rounded-lg border border-brand-border bg-white px-3 py-2 text-sm text-brand-text outline-none placeholder:text-brand-muted/50 focus:border-brand-blue/50"
                    />
                    <div className="mt-1 text-right text-xs text-brand-muted">
                      {reason.length}/500
                    </div>
                  </div>
                </>
              )}

              {error && (
                <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
                  {error}
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClose}
                  disabled={submitting}
                >
                  {viewOnly ? "关闭" : "取消"}
                </Button>
                {!viewOnly && (
                  <Button
                    size="sm"
                    onClick={handleSubmit}
                    disabled={submitting || !reason.trim()}
                    className="bg-black text-white hover:bg-neutral-800"
                  >
                    {submitting ? "提交中..." : "提交报告"}
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
