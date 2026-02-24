/**
 * Site Card Component - Enhanced with shadcn/ui + Framer Motion
 */

"use client";

import { Site } from "@/lib/contracts/types/site";
import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Star,
  EyeOff,
  Copy,
  Check,
  Gift,
  Languages,
  CalendarCheck,
  MoreHorizontal,
  Activity,
  CreditCard,
  Pencil,
  History,
  Flag,
} from "lucide-react";

interface SiteCardProps {
  site: Site;
  isFavorite: boolean;
  isHidden: boolean;
  canEdit: boolean;
  variant?: "grid" | "list";
  onEdit: (site: Site) => void;
  onViewLogs: (site: Site) => void;
  onToggleFavorite: (id: string) => void;
  onToggleHidden: (id: string) => void;
  onReport?: (site: Site) => void;
}

type HealthViewStatus = "up" | "slow" | "down" | "unknown";

const HEALTH_ERROR_LABELS: Record<string, string> = {
  invalid_url: "URL 不合法",
  invalid_protocol: "仅允许 HTTPS",
  blocked_private_ip: "目标地址为内网",
  blocked_localhost: "目标地址为本地",
  dns_lookup_failed: "DNS 解析失败",
  connect_timeout: "连接超时",
  fetch_failed: "连接失败",
  redirect_invalid: "重定向地址无效",
  redirect_exceeded: "重定向次数过多",
  redirect_to_insecure: "重定向到非 HTTPS",
  redirect_to_private: "重定向到内网地址",
};

function formatHealthError(error?: string) {
  if (!error) return "不可达";
  return HEALTH_ERROR_LABELS[error] || error;
}

function formatHealthTime(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString("zh-CN", { hour12: false });
}

function getHealthStatus(health?: Site["health"]): HealthViewStatus {
  if (!health?.checkedAt) return "unknown";
  return health.status ?? "unknown";
}

function getHealthDotClass(status: HealthViewStatus) {
  switch (status) {
    case "up":
      return "bg-green-500";
    case "slow":
      return "bg-yellow-500";
    case "down":
      return "bg-red-500";
    default:
      return "bg-gray-300";
  }
}

function buildHealthTooltip(health?: Site["health"]) {
  if (!health?.checkedAt) {
    return "未检查";
  }
  const parts: string[] = [];
  if (health.status === "down") {
    parts.push(formatHealthError(health.error));
  } else if (health.status === "slow" && health.httpStatus && health.httpStatus >= 500) {
    parts.push(`HTTP ${health.httpStatus}`);
  }
  if (typeof health.latencyMs === "number") {
    parts.push(`延迟 ${health.latencyMs}ms`);
  }
  const timeLabel = formatHealthTime(health.checkedAt);
  if (timeLabel) {
    parts.push(`更新时间 ${timeLabel}`);
  }
  return parts.join(" · ");
}

export function SiteCard({
  site,
  isFavorite,
  isHidden,
  canEdit,
  variant = "grid",
  onEdit,
  onViewLogs,
  onToggleFavorite,
  onToggleHidden,
  onReport,
}: SiteCardProps) {
  const healthStatus = getHealthStatus(site.health);
  const healthDotClass = getHealthDotClass(healthStatus);
  const healthTooltip = buildHealthTooltip(site.health);
  const [copied, setCopied] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [maintainerMenuOpen, setMaintainerMenuOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const primaryMaintainer = site.maintainers?.[0];
  const maintainerUsernames = (site.maintainers ?? [])
    .map(
      (maintainer) =>
        maintainer.username ||
        maintainer.profileUrl?.match(/linux\.do\/u\/([^/]+)\/summary/i)?.[1] ||
        ""
    )
    .filter(Boolean);
  const maintainerUsernamesAttr = maintainerUsernames.join(",");
  const maintainerLinks = (site.maintainers ?? [])
    .filter((maintainer) => Boolean(maintainer.profileUrl))
    .map((maintainer) => ({
      name: maintainer.name,
      url: maintainer.profileUrl as string,
    }));
  const hasMultipleMaintainers = maintainerLinks.length > 1;
  const primaryMaintainerUrl = maintainerLinks[0]?.url ?? "";
  const maintainerLabel = primaryMaintainer?.name || "站长";
  const visualLength = Array.from(maintainerLabel).reduce((acc, ch) => {
    const isAscii = ch.charCodeAt(0) <= 0x7f;
    return acc + (isAscii ? 0.6 : 1);
  }, 0);
  const maintainerTextClass =
    visualLength <= 2.4
      ? "text-[12px]"
      : visualLength <= 3.6
      ? "text-[11px]"
      : visualLength <= 5
      ? "text-[10px]"
      : visualLength <= 6.2
      ? "text-[9px]"
      : "text-[8px]";
  const supportsTranslation = site.supportsImmersiveTranslation;
  const rateLimitLabel = site.rateLimit ? site.rateLimit : "UNKNOWN";
  const formattedUpdatedAt = (() => {
    if (!site.updatedAt) return "未知";
    const date = new Date(site.updatedAt);
    if (Number.isNaN(date.getTime())) return "未知";
    const utc = date.getTime() + date.getTimezoneOffset() * 60 * 1000;
    const beijing = new Date(utc + 8 * 60 * 60 * 1000);
    const pad = (value: number) => String(value).padStart(2, "0");
    return `${beijing.getFullYear()}-${pad(beijing.getMonth() + 1)}-${pad(
      beijing.getDate()
    )} ${pad(beijing.getHours())}:${pad(beijing.getMinutes())}:${pad(
      beijing.getSeconds()
    )}`;
  })();
  const extensionLinks = (site.extensionLinks ?? []).filter(
    (link) => Boolean(link.label) && Boolean(link.url)
  );
  const hasMoreLinks = extensionLinks.length > 0;
  const checkinHref = site.supportsCheckin
    ? site.checkinUrl?.trim() ||
      `${site.apiBaseUrl.replace(/\/$/, "")}/console/personal`
    : "";
  const isCardActive = isHovered || maintainerMenuOpen || moreMenuOpen;
  const registrationBadgeClass = (() => {
    switch (site.registrationLimit) {
      case 0:
        return "border-slate-200 bg-slate-50 text-slate-600";
      case 1:
        return "border-sky-200 bg-sky-50 text-sky-700";
      case 2:
        return "border-indigo-200 bg-indigo-50 text-indigo-700";
      case 3:
        return "border-brand-blue/50 bg-brand-blue/10 text-amber-700/90";
      default:
        return "border-brand-blue/30 bg-brand-blue/5 text-brand-blue";
    }
  })();

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(site.apiBaseUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  const tagContainerRef = useRef<HTMLDivElement | null>(null);
  const tagMeasureRef = useRef<HTMLDivElement | null>(null);
  const descriptionRef = useRef<HTMLParagraphElement | null>(null);
  const tagLabels = useMemo(() => {
    return Array.from(new Set(site.tags));
  }, [site.tags]);
  const [visibleTagCount, setVisibleTagCount] = useState(tagLabels.length);
  const [isDescriptionTruncated, setIsDescriptionTruncated] = useState(false);
  const descriptionText =
    site.description?.trim() || "暂无描述，站长大大快来添加吧～";

  useLayoutEffect(() => {
    const container = tagContainerRef.current;
    const measure = tagMeasureRef.current;
    if (!container || !measure) return;

    const computeVisibleCount = () => {
      const containerWidth = container.clientWidth;
      if (!containerWidth) return;
      const gap = parseFloat(getComputedStyle(measure).gap || "0");
      const nodes = Array.from(measure.children) as HTMLElement[];
      if (nodes.length === 0) return;

      const tagWidths = nodes
        .slice(0, tagLabels.length)
        .map((node) => node.offsetWidth);
      const plusWidth = nodes[nodes.length - 1]?.offsetWidth ?? 0;

      let used = 0;
      let count = 0;
      for (let i = 0; i < tagWidths.length; i += 1) {
        const nextWidth = tagWidths[i];
        const nextUsed = used + (count > 0 ? gap : 0) + nextWidth;
        const remaining = tagLabels.length - (count + 1);
        const needsPlus = remaining > 0;
        const totalWithPlus = needsPlus ? nextUsed + gap + plusWidth : nextUsed;
        if (totalWithPlus <= containerWidth) {
          used = nextUsed;
          count += 1;
        } else {
          break;
        }
      }

      if (count !== visibleTagCount) {
        setVisibleTagCount(count);
      }
    };

    computeVisibleCount();

    const resizeObserver = new ResizeObserver(() => {
      computeVisibleCount();
    });
    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, [tagLabels, visibleTagCount]);

  useEffect(() => {
    setVisibleTagCount(tagLabels.length);
  }, [tagLabels.length]);

  useLayoutEffect(() => {
    const descriptionElement = descriptionRef.current;
    if (!descriptionElement) return;

    const computeIsTruncated = () => {
      const isTruncated =
        descriptionElement.scrollHeight > descriptionElement.clientHeight ||
        descriptionElement.scrollWidth > descriptionElement.clientWidth;
      setIsDescriptionTruncated(isTruncated);
    };

    computeIsTruncated();

    const resizeObserver = new ResizeObserver(computeIsTruncated);
    resizeObserver.observe(descriptionElement);
    return () => resizeObserver.disconnect();
  }, [descriptionText]);

  const visibleTagLabels = tagLabels.slice(0, visibleTagCount);
  const hiddenTagCount = Math.max(0, tagLabels.length - visibleTagCount);
  const hiddenTagLabels = tagLabels.slice(visibleTagCount).join(" / ");
  const tagBadges = visibleTagLabels.map((tagLabel, index) => (
    <Badge
      key={`${tagLabel}-${index}`}
      variant="secondary"
      className="whitespace-nowrap px-1.5 py-0.5 text-[9px] font-medium"
    >
      {tagLabel}
    </Badge>
  ));

  // 列表视图
  if (variant === "list") {
    return (
      <motion.div
        layout
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        transition={{ duration: 0.2 }}
      >
        <Card
          className={`group relative overflow-hidden border border-brand-border bg-white transition-all duration-200 hover:border-brand-blue/30 hover:shadow-md ${
            isHidden ? "opacity-60 grayscale" : ""
          }`}
        >
          <div className="flex items-center gap-4 p-4">
            {/* 站长头像 */}
            <div className="relative h-10 w-10 shrink-0">
              <motion.div
                whileHover={{
                  scale: 1.08,
                  boxShadow: "0 0 20px rgba(255,177,3,0.45)",
                }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
                className="rounded-full"
              >
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-[radial-gradient(120%_120%_at_30%_20%,rgba(255,255,255,0.9)_0%,rgba(255,255,255,0.35)_35%,rgba(255,255,255,0)_60%),linear-gradient(135deg,rgba(255,240,200,0.9)_0%,rgba(255,210,120,0.55)_45%,rgba(255,240,210,0.9)_100%),conic-gradient(from_210deg_at_45%_45%,#FFE7A6_0deg,#FFF3D6_70deg,#FFD980_140deg,#FFF0C9_205deg,#FFE7A6_290deg,#FFD46B_360deg)] text-brand-text shadow-sm ring-1 ring-white/40"
                  data-ld-username={maintainerUsernamesAttr}
                >
                  {hasMultipleMaintainers ? (
                    <DropdownMenu
                      open={maintainerMenuOpen}
                      onOpenChange={setMaintainerMenuOpen}
                    >
                      <DropdownMenuTrigger asChild>
                        <div
                          className="flex h-full w-full items-center justify-center rounded-full shadow-sm outline-none focus-visible:ring-0"
                          onMouseEnter={() => setMaintainerMenuOpen(true)}
                          onMouseLeave={() => setMaintainerMenuOpen(false)}
                          role="button"
                          tabIndex={0}
                          aria-label="维护者列表"
                        >
                          <span
                            className={`max-w-[32px] truncate text-center font-semibold leading-none text-amber-900/80 ${maintainerTextClass}`}
                          >
                            {maintainerLabel}
                          </span>
                        </div>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="center"
                        side="top"
                        className="flex items-center justify-center gap-2 px-2 py-1.5"
                        onMouseEnter={() => setMaintainerMenuOpen(true)}
                        onMouseLeave={() => setMaintainerMenuOpen(false)}
                      >
                        {maintainerLinks.map((maintainer, index) => (
                          <React.Fragment
                            key={`${maintainer.name}-${maintainer.url}`}
                          >
                            {index > 0 && (
                              <span className="h-3 w-px bg-brand-muted/40" />
                            )}
                            <DropdownMenuItem
                              asChild
                              className="px-0 py-0 focus:bg-transparent data-[highlighted]:bg-transparent"
                            >
                              <a
                                href={maintainer.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="rounded-full px-1.5 py-0.5 text-xs font-medium text-brand-text transition-transform duration-150 hover:bg-brand-yellow/40 hover:scale-105"
                              >
                                {maintainer.name}
                              </a>
                            </DropdownMenuItem>
                          </React.Fragment>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : (
                    <TooltipProvider delayDuration={0}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          {primaryMaintainerUrl ? (
                            <a
                              href={primaryMaintainerUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label={`Visit ${
                                primaryMaintainer?.name ?? "maintainer"
                              } profile`}
                              className="flex h-full w-full items-center justify-center rounded-full shadow-sm outline-none focus-visible:ring-0"
                            >
                              <span
                                className={`max-w-[32px] truncate text-center font-semibold leading-none text-amber-900/80 ${maintainerTextClass}`}
                              >
                                {maintainerLabel}
                              </span>
                            </a>
                          ) : (
                            <div className="flex h-full w-full items-center justify-center rounded-full shadow-sm">
                              <span
                                className={`max-w-[32px] truncate text-center font-semibold leading-none text-amber-900/80 ${maintainerTextClass}`}
                              >
                                {maintainerLabel}
                              </span>
                            </div>
                          )}
                        </TooltipTrigger>
                        <TooltipContent>
                          {primaryMaintainer?.name || "站长"}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
              </motion.div>
              {hasMultipleMaintainers && (
                <span className="pointer-events-none absolute -right-1 -top-1 z-10 flex h-4 min-w-4 items-center justify-center rounded-full border border-white/70 bg-amber-200 px-1 text-[8px] font-semibold text-amber-900 shadow-sm">
                  {maintainerLinks.length}
                </span>
              )}
            </div>

            {/* 站点信息 */}
            <div className="flex-1 min-w-0 flex items-center gap-2">
              <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span
                      className={`h-2.5 w-2.5 shrink-0 rounded-full ${healthDotClass}`}
                      aria-label="健康状态"
                    />
                  </TooltipTrigger>
                  <TooltipContent>{healthTooltip}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <div className="min-w-0 flex items-center gap-1">
                <h3 className="truncate text-sm font-semibold text-brand-text">
                  {site.apiBaseUrl ? (
                    <a
                      href={site.apiBaseUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-brand-blue"
                    >
                      {site.name}
                    </a>
                  ) : (
                    site.name
                  )}
                </h3>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <TooltipProvider delayDuration={0}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span
                        className={`inline-flex items-center rounded-full border px-1.5 py-0 text-[9px] font-semibold ${registrationBadgeClass}`}
                      >
                        LV{site.registrationLimit}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>等级要求</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge
                        variant="secondary"
                        className="px-1.5 py-0.5 text-[9px] font-semibold"
                      >
                        {rateLimitLabel}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>速率限制</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              {tagLabels.length > 0 && (
                <>
                  <span className="h-3 w-px bg-slate-200 shrink-0" />
                  <div className="hidden sm:flex items-center gap-1 overflow-hidden shrink-0">
                    {tagLabels.slice(0, 5).map((label, index) => (
                      <Badge
                        key={`${label}-${index}`}
                        variant="secondary"
                        className="whitespace-nowrap px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground"
                      >
                        {label}
                      </Badge>
                    ))}
                    {tagLabels.length > 5 && (
                      <TooltipProvider delayDuration={0}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge
                              variant="secondary"
                              className="whitespace-nowrap px-1.5 py-0 text-[9px] font-medium text-muted-foreground"
                            >
                              +{tagLabels.length - 5}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            {tagLabels.slice(5).join(" / ")}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* 特性图标 - 与卡片视图保持一致的 6 个按钮 */}
            <TooltipProvider delayDuration={0}>
              <div className="flex items-center gap-1.5 shrink-0">
                {/* 签到页 */}
                {site.supportsCheckin && checkinHref ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <a
                        href={checkinHref}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <div className="flex h-7 w-7 items-center justify-center rounded-full border border-brand-blue/30 bg-brand-blue/5 text-brand-blue">
                          <CalendarCheck className="h-3.5 w-3.5" />
                        </div>
                      </a>
                    </TooltipTrigger>
                    <TooltipContent>
                      {site.checkinNote?.trim() || "签到页"}
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex h-7 w-7 items-center justify-center rounded-full border border-brand-border bg-gray-50 text-brand-muted/50 opacity-60">
                        <CalendarCheck className="h-3.5 w-3.5" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>签到页（暂无）</TooltipContent>
                  </Tooltip>
                )}
                {/* 福利站 */}
                {site.benefitUrl ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <a
                        href={site.benefitUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <div className="flex h-7 w-7 items-center justify-center rounded-full border border-brand-blue/30 bg-brand-blue/5 text-brand-blue">
                          <Gift className="h-3.5 w-3.5" />
                        </div>
                      </a>
                    </TooltipTrigger>
                    <TooltipContent>福利站</TooltipContent>
                  </Tooltip>
                ) : (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex h-7 w-7 items-center justify-center rounded-full border border-brand-border bg-gray-50 text-brand-muted/50 opacity-60">
                        <Gift className="h-3.5 w-3.5" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>福利站（暂无）</TooltipContent>
                  </Tooltip>
                )}
                {/* 状态页 */}
                {site.statusUrl ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <a
                        href={site.statusUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <div className="flex h-7 w-7 items-center justify-center rounded-full border border-brand-blue/30 bg-brand-blue/5 text-brand-blue">
                          <Activity className="h-3.5 w-3.5" />
                        </div>
                      </a>
                    </TooltipTrigger>
                    <TooltipContent>状态页</TooltipContent>
                  </Tooltip>
                ) : (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex h-7 w-7 items-center justify-center rounded-full border border-brand-border bg-gray-50 text-brand-muted/50 opacity-60">
                        <Activity className="h-3.5 w-3.5" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>状态页（暂无）</TooltipContent>
                  </Tooltip>
                )}
                {/* 更多 */}
                {hasMoreLinks ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="flex h-7 w-7 items-center justify-center rounded-full border border-brand-blue/30 bg-brand-blue/5 text-brand-blue hover:bg-brand-blue/10 focus:outline-none"
                      >
                        <MoreHorizontal className="h-3.5 w-3.5" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" sideOffset={6}>
                      <DropdownMenuLabel>更多选项</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {extensionLinks.map((link) => (
                        <DropdownMenuItem
                          key={`${link.label}-${link.url}`}
                          asChild
                        >
                          <a
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="cursor-pointer"
                          >
                            {link.label}
                          </a>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex h-7 w-7 items-center justify-center rounded-full border border-brand-border bg-gray-50 text-brand-muted/50 opacity-60">
                        <MoreHorizontal className="h-3.5 w-3.5" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>更多（暂无）</TooltipContent>
                  </Tooltip>
                )}
              </div>
              {/* 沉浸式翻译 + LDC */}
              <div className="flex items-center gap-1.5 shrink-0">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className={`flex h-7 w-7 items-center justify-center rounded-full border ${
                        supportsTranslation
                          ? "border-amber-200 bg-amber-50 text-amber-700"
                          : "border-gray-200 bg-gray-50 text-gray-400"
                      }`}
                    >
                      <Languages className="h-3.5 w-3.5" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    {supportsTranslation ? "支持沉浸式翻译" : "禁止沉浸式翻译"}
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className={`flex h-7 w-7 items-center justify-center rounded-full border ${
                        site.supportsLdc
                          ? "border-amber-200 bg-amber-50 text-amber-700"
                          : "border-gray-200 bg-gray-50 text-gray-400"
                      }`}
                    >
                      <CreditCard className="h-3.5 w-3.5" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    {site.supportsLdc ? "支持 LDC" : "不支持 LDC"}
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className={`flex h-7 w-7 items-center justify-center rounded-full border ${
                        site.supportsNsfw
                          ? "border-amber-200 bg-amber-50 text-amber-700"
                          : "border-gray-200 bg-gray-50 text-gray-400"
                      }`}
                    >
                      <span className="text-[9px] font-black leading-none">
                        18+
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    {site.supportsNsfw ? "支持 NSFW" : "禁止 NSFW"}
                  </TooltipContent>
                </Tooltip>
              </div>
            </TooltipProvider>

            {/* 操作按钮 */}
            <div className="flex items-center gap-1 shrink-0">
              <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={handleCopyUrl}
                      className="h-7 w-7 text-muted-foreground hover:text-brand-blue"
                    >
                      {copied ? (
                        <Check className="h-3.5 w-3.5 text-brand-green" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>复制 API 地址</TooltipContent>
                </Tooltip>

                {canEdit && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => onEdit(site)}
                        className="h-7 w-7 text-muted-foreground hover:text-brand-text"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>编辑</TooltipContent>
                  </Tooltip>
                )}

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => onToggleFavorite(site.id)}
                      className={`h-7 w-7 ${
                        isFavorite
                          ? "text-yellow-500 hover:text-yellow-600"
                          : "text-muted-foreground"
                      }`}
                    >
                      <Star
                        className={`h-3.5 w-3.5 ${
                          isFavorite ? "fill-current" : ""
                        }`}
                      />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>收藏</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => onToggleHidden(site.id)}
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    >
                      <EyeOff className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>隐藏</TooltipContent>
                </Tooltip>

                {onReport && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => onReport(site)}
                        className="h-7 w-7 text-muted-foreground hover:text-black"
                      >
                        <Flag className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>报告</TooltipContent>
                  </Tooltip>
                )}
              </TooltipProvider>
            </div>
          </div>
        </Card>
      </motion.div>
    );
  }

  // 卡片视图（默认）

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{
        opacity: 1,
        y: isHovered || maintainerMenuOpen || moreMenuOpen ? -4 : 0,
      }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
    >
      <Card
        className={`group relative h-full min-h-[280px] overflow-hidden border border-brand-border bg-white transition-all duration-300 ${
          isCardActive ? "border-brand-blue/30 shadow-lg" : ""
        } ${isHidden ? "opacity-60 grayscale" : ""}`}
      >
        <div className="flex h-full flex-col gap-3 p-6">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4 flex-1 min-w-0">
              {/* Maintainer Avatar */}
              <motion.div
                whileHover={{
                  scale: 1.08,
                  boxShadow: "0 0 28px rgba(255,177,3,0.55)",
                }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
                className="rounded-full"
              >
                <div className="relative h-11 w-11 shrink-0">
                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-full bg-[radial-gradient(120%_120%_at_30%_20%,rgba(255,255,255,0.9)_0%,rgba(255,255,255,0.35)_35%,rgba(255,255,255,0)_60%),linear-gradient(135deg,rgba(255,240,200,0.9)_0%,rgba(255,210,120,0.55)_45%,rgba(255,240,210,0.9)_100%),conic-gradient(from_210deg_at_45%_45%,#FFE7A6_0deg,#FFF3D6_70deg,#FFD980_140deg,#FFF0C9_205deg,#FFE7A6_290deg,#FFD46B_360deg)] text-brand-text shadow-[0_10px_24px_-12px_rgba(255,200,80,0.4)] ring-1 ring-white/40"
                    data-ld-username={maintainerUsernamesAttr}
                  >
                    {hasMultipleMaintainers ? (
                      <DropdownMenu
                        open={maintainerMenuOpen}
                        onOpenChange={setMaintainerMenuOpen}
                      >
                        <DropdownMenuTrigger asChild>
                          <div
                            className="flex h-full w-full items-center justify-center rounded-full shadow-sm outline-none focus-visible:ring-0"
                            onMouseEnter={() => setMaintainerMenuOpen(true)}
                            onMouseLeave={() => setMaintainerMenuOpen(false)}
                            role="button"
                            tabIndex={0}
                            aria-label="维护者列表"
                          >
                            <span
                              className={`max-w-[34px] truncate text-center font-semibold leading-none text-amber-900/80 ${maintainerTextClass}`}
                            >
                              {maintainerLabel}
                            </span>
                          </div>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="center"
                          side="top"
                          className="flex items-center justify-center gap-2 px-2 py-1.5"
                          onMouseEnter={() => setMaintainerMenuOpen(true)}
                          onMouseLeave={() => setMaintainerMenuOpen(false)}
                        >
                          {maintainerLinks.map((maintainer, index) => (
                            <React.Fragment
                              key={`${maintainer.name}-${maintainer.url}`}
                            >
                              {index > 0 && (
                                <span className="h-3 w-px bg-brand-muted/40" />
                              )}
                              <DropdownMenuItem
                                asChild
                                className="px-0 py-0 focus:bg-transparent data-[highlighted]:bg-transparent"
                              >
                                <a
                                  href={maintainer.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="rounded-full px-1.5 py-0.5 text-xs font-medium text-brand-text transition-transform duration-150 hover:bg-brand-yellow/40 hover:scale-105"
                                >
                                  {maintainer.name}
                                </a>
                              </DropdownMenuItem>
                            </React.Fragment>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : (
                      <TooltipProvider delayDuration={0}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            {primaryMaintainerUrl ? (
                              <a
                                href={primaryMaintainerUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label={`Visit ${
                                  primaryMaintainer?.name ?? "maintainer"
                                } profile`}
                                className="flex h-full w-full items-center justify-center rounded-full shadow-sm outline-none focus-visible:ring-0"
                              >
                                <span
                                  className={`max-w-[34px] truncate text-center font-semibold leading-none text-amber-900/80 ${maintainerTextClass}`}
                                >
                                  {maintainerLabel}
                                </span>
                              </a>
                            ) : (
                              <div className="flex h-full w-full items-center justify-center rounded-full shadow-sm">
                                <span
                                  className={`max-w-[34px] truncate text-center font-semibold leading-none text-amber-900/80 ${maintainerTextClass}`}
                                >
                                  {maintainerLabel}
                                </span>
                              </div>
                            )}
                          </TooltipTrigger>
                          <TooltipContent>
                            {primaryMaintainer?.name || "站长"}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                  {hasMultipleMaintainers && (
                    <span className="pointer-events-none absolute -right-1 -top-1 z-10 flex h-5 min-w-5 items-center justify-center rounded-full border border-white/70 bg-amber-200 px-1 text-[9px] font-semibold text-amber-900 shadow-sm">
                      {maintainerLinks.length}
                    </span>
                  )}
                </div>
              </motion.div>

              {/* Title & Meta */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="min-w-0 flex items-center gap-1">
                    <h3 className="min-w-0 truncate text-base font-semibold tracking-tight text-brand-text">
                      {site.apiBaseUrl ? (
                        <a
                          href={site.apiBaseUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-brand-blue"
                        >
                          {site.name}
                        </a>
                      ) : (
                        site.name
                      )}
                    </h3>
                  </div>
                </div>
                <div className="mt-0.5 flex items-center gap-2">
                  <TooltipProvider delayDuration={0}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span
                          className={`inline-flex items-center rounded-full border px-1.5 py-0 text-[9px] font-semibold ${registrationBadgeClass}`}
                        >
                          LV{site.registrationLimit}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>等级要求</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <TooltipProvider delayDuration={0}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge
                          variant="secondary"
                          className="px-1.5 py-0.5 text-[9px] font-semibold"
                        >
                          {rateLimitLabel}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>速率限制</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex shrink-0 gap-0">
              {canEdit && (
                <motion.div whileTap={{ scale: 0.95 }}>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => onEdit(site)}
                    className="h-8 w-8 text-muted-foreground hover:text-brand-text"
                    title="Edit"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </motion.div>
              )}
              <motion.div whileTap={{ scale: 0.95 }}>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => onViewLogs(site)}
                  className="h-8 w-8 text-muted-foreground hover:text-brand-text"
                  title="操作日志"
                >
                  <History className="h-4 w-4" />
                </Button>
              </motion.div>
              <motion.div whileTap={{ scale: 0.95 }}>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => onToggleFavorite(site.id)}
                  className={`h-8 w-8 ${
                    isFavorite
                      ? "text-yellow-500 hover:text-yellow-600"
                      : "text-muted-foreground"
                  }`}
                  title="Favorite"
                >
                  <Star
                    className={`h-4 w-4 ${isFavorite ? "fill-current" : ""}`}
                  />
                </Button>
              </motion.div>
              <motion.div whileTap={{ scale: 0.95 }}>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => onToggleHidden(site.id)}
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  title="Hide"
                >
                  <EyeOff className="h-4 w-4" />
                </Button>
              </motion.div>
              {onReport && (
                <motion.div whileTap={{ scale: 0.95 }}>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => onReport(site)}
                    className="h-8 w-8 text-muted-foreground hover:text-black"
                    title="报告"
                  >
                    <Flag className="h-4 w-4" />
                  </Button>
                </motion.div>
              )}
            </div>
          </div>

          {/* Content Group: Tags + Description */}
          <div className="flex flex-col gap-2 min-h-[4.25rem]">
            <div className="relative h-[1.75rem] shrink-0">
              <div
                ref={tagContainerRef}
                className="flex max-h-[1.75rem] flex-nowrap gap-1 overflow-hidden"
              >
                {tagBadges}
                {hiddenTagCount > 0 && (
                  <TooltipProvider delayDuration={0}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge
                          variant="secondary"
                          className="whitespace-nowrap px-1.5 py-0.5 text-[9px] font-medium"
                        >
                          +{hiddenTagCount}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>{hiddenTagLabels}</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
              <div
                ref={tagMeasureRef}
                className="pointer-events-none absolute left-0 top-0 -z-10 flex max-h-[1.75rem] flex-nowrap gap-1 opacity-0"
              >
                {tagLabels.map((label, index) => (
                  <Badge
                    key={`${label}-${index}`}
                    variant="secondary"
                    className="whitespace-nowrap px-1.5 py-0.5 text-[9px] font-medium"
                  >
                    {label}
                  </Badge>
                ))}
                <Badge
                  variant="secondary"
                  className="whitespace-nowrap px-1.5 py-0.5 text-[9px] font-medium"
                >
                  +{Math.max(1, tagLabels.length - 1)}
                </Badge>
              </div>
            </div>
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <p
                    ref={descriptionRef}
                    className={`h-8 line-clamp-2 text-xs leading-4 ${
                      isDescriptionTruncated ? "cursor-help" : ""
                    } ${
                      site.description?.trim()
                        ? "text-brand-muted/80"
                        : "italic text-brand-muted/50"
                    }`}
                  >
                    {descriptionText}
                  </p>
                </TooltipTrigger>
                {site.description?.trim() && isDescriptionTruncated && (
                  <TooltipContent className="max-w-sm">
                    {descriptionText}
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* API Endpoint */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] font-bold tracking-wider text-brand-muted/70">
              <span>API ENDPOINT</span>
            </div>
            <motion.div
              className="group/url relative"
              whileHover={{ scale: 1.01 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
              role="button"
              tabIndex={0}
              onClick={handleCopyUrl}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleCopyUrl();
                }
              }}
              aria-label="复制 API 地址"
            >
              <div className="rounded-lg border border-brand-border bg-gray-50/50 px-3 py-2.5 text-[11px] font-mono text-brand-muted transition-colors group-hover/url:border-brand-blue/20 group-hover/url:bg-white">
                <div className="flex items-center gap-2">
                  <TooltipProvider delayDuration={0}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span
                          className={`h-2 w-2 shrink-0 rounded-full ${healthDotClass}`}
                          aria-label="健康状态"
                        />
                      </TooltipTrigger>
                      <TooltipContent>{healthTooltip}</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <span className="flex-1 truncate">{site.apiBaseUrl}</span>
                  {copied ? (
                    <Check className="h-3 w-3 shrink-0 text-brand-green" />
                  ) : (
                    <Copy className="h-3 w-3 shrink-0 text-brand-blue opacity-50 group-hover/url:opacity-100 transition-opacity" />
                  )}
                </div>
              </div>
            </motion.div>
          </div>

          {/* Footer */}
          <div className="mt-auto space-y-3 border-t border-gray-100 pt-4">
            <div className="flex items-center justify-between">
              <TooltipProvider delayDuration={0}>
                <div className="flex gap-2">
                  {[
                    {
                      enabled: site.supportsCheckin,
                      href: checkinHref,
                      icon: CalendarCheck,
                      label: "签到页",
                      title: site.checkinNote?.trim() || "签到页",
                    },
                    {
                      enabled: Boolean(site.benefitUrl),
                      href: site.benefitUrl,
                      icon: Gift,
                      label: "福利站",
                    },
                    {
                      enabled: Boolean(site.statusUrl),
                      href: site.statusUrl,
                      icon: Activity,
                      label: "状态页",
                    },
                  ].map(({ href, icon: Icon, label, enabled, title }) => {
                    const displayTitle = enabled
                      ? title || label
                      : `${label}（暂无）`;
                    if (enabled && href) {
                      return (
                        <Tooltip key={label}>
                          <TooltipTrigger asChild>
                            <motion.a
                              href={href as string}
                              target="_blank"
                              rel="noopener noreferrer"
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.97 }}
                            >
                              <div className="flex h-8 w-8 items-center justify-center rounded-full border border-brand-blue/30 bg-brand-blue/5 text-brand-blue shadow-[0_2px_8px_-4px_rgba(37,99,235,0.45)]">
                                <Icon className="h-4 w-4" />
                                <span className="sr-only">{label}</span>
                              </div>
                            </motion.a>
                          </TooltipTrigger>
                          <TooltipContent>{displayTitle}</TooltipContent>
                        </Tooltip>
                      );
                    }

                    return (
                      <Tooltip key={label}>
                        <TooltipTrigger asChild>
                          <div
                            className="flex h-8 w-8 items-center justify-center rounded-full border border-brand-border bg-gray-50 text-brand-muted/50 opacity-60"
                            aria-disabled="true"
                          >
                            <Icon className="h-4 w-4" />
                            <span className="sr-only">{label}</span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>{displayTitle}</TooltipContent>
                      </Tooltip>
                    );
                  })}
                  {hasMoreLinks ? (
                    <DropdownMenu
                      open={moreMenuOpen}
                      onOpenChange={setMoreMenuOpen}
                    >
                      <DropdownMenuTrigger asChild>
                        <motion.button
                          type="button"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.97 }}
                          className="focus:outline-none"
                        >
                          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-brand-blue/30 bg-brand-blue/5 text-brand-blue shadow-[0_2px_8px_-4px_rgba(37,99,235,0.45)]">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">更多</span>
                          </div>
                        </motion.button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="start"
                        side="bottom"
                        sideOffset={6}
                        avoidCollisions={false}
                      >
                        <DropdownMenuLabel>更多选项</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {extensionLinks.map((link) => (
                          <DropdownMenuItem
                            key={`${link.label}-${link.url}`}
                            asChild
                          >
                            <a
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="cursor-pointer"
                            >
                              {link.label}
                            </a>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div
                          className="flex h-8 w-8 items-center justify-center rounded-full border border-brand-border bg-gray-50 text-brand-muted/50 opacity-60"
                          aria-disabled="true"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">更多</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>更多（暂无）</TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </TooltipProvider>
              <div className="flex items-center gap-2 text-brand-muted/70">
                <TooltipProvider delayDuration={0}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-full border ${
                          supportsTranslation
                            ? "border-amber-200 bg-amber-50 text-amber-700"
                            : "border-gray-200 bg-gray-50 text-gray-400"
                        }`}
                      >
                        <Languages className="h-4 w-4" />
                        <span className="sr-only">
                          {supportsTranslation
                            ? "支持沉浸式翻译"
                            : "禁止沉浸式翻译"}
                        </span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      {supportsTranslation
                        ? "支持沉浸式翻译"
                        : "禁止沉浸式翻译"}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <TooltipProvider delayDuration={0}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-full border ${
                          site.supportsLdc
                            ? "border-amber-200 bg-amber-50 text-amber-700"
                            : "border-gray-200 bg-gray-50 text-gray-400"
                        }`}
                      >
                        <CreditCard className="h-4 w-4" />
                        <span className="sr-only">
                          {site.supportsLdc ? "支持 LDC" : "不支持 LDC"}
                        </span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      {site.supportsLdc ? "支持 LDC" : "不支持 LDC"}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <TooltipProvider delayDuration={0}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-full border ${
                          site.supportsNsfw
                            ? "border-amber-200 bg-amber-50 text-amber-700"
                            : "border-gray-200 bg-gray-50 text-gray-400"
                        }`}
                      >
                        <span className="text-[10px] font-black leading-none">
                          18+
                        </span>
                        <span className="sr-only">
                          {site.supportsNsfw ? "支持 NSFW" : "禁止 NSFW"}
                        </span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      {site.supportsNsfw ? "支持 NSFW" : "禁止 NSFW"}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
            <div className="text-[10px] font-medium text-brand-muted/70">
              更新时间：{formattedUpdatedAt}
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
