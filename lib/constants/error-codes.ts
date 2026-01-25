/**
 * API错误码常量
 */
export const API_ERROR_CODES = {
  // 权限相关
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  DESCRIPTION_PERMISSION_DENIED: "DESCRIPTION_PERMISSION_DENIED",
  VISIBILITY_PERMISSION_DENIED: "VISIBILITY_PERMISSION_DENIED",

  // 验证相关
  INVALID_URL: "INVALID_URL",
  DUPLICATE_URL: "DUPLICATE_URL",
  MISSING_FIELDS: "MISSING_FIELDS",

  // 服务器错误
  SERVER_ERROR: "SERVER_ERROR",
} as const;

export type ApiErrorCode = typeof API_ERROR_CODES[keyof typeof API_ERROR_CODES];

/**
 * API错误响应类型
 */
export interface ApiErrorResponse {
  error: string;
  code: ApiErrorCode;
  details?: Record<string, unknown>;
}
