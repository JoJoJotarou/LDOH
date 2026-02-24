/**
 * Site Types - 公益站点类型定义
 *
 * 基于 PRD 第 4 节：数据模型（概念层）
 */

/**
 * 站长信息
 */
export interface Maintainer {
  /** 站长显示名称 */
  name: string;
  /** 站长 ID（历史字段，兼容旧数据） */
  id: string;
  /** 站长用户名（LinuxDo username） */
  username?: string;
  /** 站长主页 URL */
  profileUrl?: string;
}

/**
 * 更多扩展链接
 */
export interface ExtensionLink {
  /** 显示名称 */
  label: string;
  /** 访问地址 */
  url: string;
}

export type SiteHealthStatus = "up" | "slow" | "down";

export interface SiteHealth {
  status: SiteHealthStatus;
  httpStatus?: number;
  latencyMs?: number;
  checkedAt?: string;
  error?: string;
  responseUrl?: string;
}

export type SitePendingReportType = "runaway" | "fake_charity";

export interface SitePendingReport {
  reportType: SitePendingReportType;
  reason: string;
  reporterUsername?: string;
  createdAt?: string;
}

/**
 * 公益站点完整信息
 */
export interface Site {
  /** 站点唯一标识符 (MUST 唯一) */
  id: string;
  /** 站点名称 (MUST 非空) */
  name: string;
  /** 站点描述 (可选) */
  description?: string;
  /** 登记限制等级（0-3 用户） */
  registrationLimit: number;
  /** 站点 logo/icon URL (可选) */
  icon?: string;
  /** API 访问基础 URL (MUST 为有效 URL) */
  apiBaseUrl: string;
  /** 支持的标签数组 */
  tags: string[];
  /** 是否支持沉浸式翻译 */
  supportsImmersiveTranslation: boolean;
  /** 是否支持 LDC 积分购买余额 */
  supportsLdc: boolean;
  /** 是否支持签到 */
  supportsCheckin: boolean;
  /** 是否支持 NSFW */
  supportsNsfw: boolean;
  /** 签到页面地址 (可选) */
  checkinUrl?: string;
  /** 签到说明或备注 (可选) */
  checkinNote?: string;
  /** 站长信息数组 */
  maintainers: Maintainer[];
  /** 福利站或权益页面链接 (可选) */
  benefitUrl?: string;
  /** 频率限制说明 (可选) */
  rateLimit?: string;
  /** 状态页链接 (可选) */
  statusUrl?: string;
  /** 更多扩展链接 (可选) */
  extensionLinks?: ExtensionLink[];
  /** 是否展示在站点列表 */
  isVisible?: boolean;
  /** 是否跑路（关站） */
  isRunaway?: boolean;
  /** 是否伪公益站点 */
  isFakeCharity?: boolean;
  /** 是否存在待处理报告 */
  hasPendingReport?: boolean;
  /** 待处理报告摘要 */
  pendingReport?: SitePendingReport;
  /** 更新时间 (可选) */
  updatedAt?: string;
  /** 健康检查状态 (可选) */
  health?: SiteHealth;
}
