import net from "net";

export type HealthStatus = "up" | "slow" | "down";

export type HealthCheckResult = {
  status: HealthStatus;
  httpStatus: number | null;
  latencyMs: number | null;
  error: string | null;
  responseUrl: string | null;
};

type HealthCheckOptions = {
  timeoutMs: number;
  slowThresholdMs: number;
  maxRedirects: number;
};

const DEFAULT_OPTIONS: HealthCheckOptions = {
  timeoutMs: 5000,
  slowThresholdMs: 3000,
  maxRedirects: 1,
};

const REDIRECT_STATUS = new Set([301, 302, 303, 307, 308]);

function isPrivateIp(address: string): boolean {
  if (net.isIPv4(address)) {
    const parts = address.split(".").map((part) => Number(part));
    if (parts.length !== 4 || parts.some((part) => !Number.isFinite(part))) {
      return true;
    }
    const [a, b] = parts;
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    if (a >= 224) return true;
    return false;
  }
  if (net.isIPv6(address)) {
    const normalized = address.toLowerCase();
    if (normalized === "::" || normalized === "::1") return true;
    if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true;
    if (
      normalized.startsWith("fe8") ||
      normalized.startsWith("fe9") ||
      normalized.startsWith("fea") ||
      normalized.startsWith("feb")
    ) {
      return true;
    }
    if (normalized.startsWith("::ffff:")) {
      const ipv4 = normalized.replace("::ffff:", "");
      if (net.isIPv4(ipv4)) {
        return isPrivateIp(ipv4);
      }
    }
    return false;
  }
  return true;
}

function validateUrl(url: URL) {
  if (url.protocol !== "https:") {
    return { ok: false, error: "invalid_protocol" };
  }
  const hostname = url.hostname.toLowerCase();
  if (hostname === "localhost" || hostname.endsWith(".localhost")) {
    return { ok: false, error: "blocked_localhost" };
  }

  if (net.isIP(hostname) && isPrivateIp(hostname)) {
    return { ok: false, error: "blocked_private_ip" };
  }

  return { ok: true };
}

function shouldFallbackToGet(status: number) {
  return status === 405 || status === 501 || status === 403;
}

async function fetchWithTimeout(url: URL, method: "HEAD" | "GET", timeoutMs: number) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url.toString(), {
      method,
      redirect: "manual",
      cache: "no-store",
      signal: controller.signal,
      headers: {
        "User-Agent": "LDOH-HealthCheck/1.0",
      },
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function checkSiteHealth(
  apiBaseUrl: string,
  overrides: Partial<HealthCheckOptions> = {}
): Promise<HealthCheckResult> {
  const options = { ...DEFAULT_OPTIONS, ...overrides };
  let currentUrl: URL;

  try {
    currentUrl = new URL(apiBaseUrl.trim());
  } catch {
    return {
      status: "down",
      httpStatus: null,
      latencyMs: null,
      error: "invalid_url",
      responseUrl: null,
    };
  }

  const initialValidation = validateUrl(currentUrl);
  if (!initialValidation.ok) {
    return {
      status: "down",
      httpStatus: null,
      latencyMs: null,
      error: initialValidation.error || "invalid_url",
      responseUrl: null,
    };
  }

  const startedAt = Date.now();
  let method: "HEAD" | "GET" = "HEAD";
  let redirects = 0;

  while (true) {
    let response: Response;
    try {
      response = await fetchWithTimeout(currentUrl, method, options.timeoutMs);
    } catch (error) {
      const errorCode =
        error instanceof Error && error.name === "AbortError"
          ? "connect_timeout"
          : "fetch_failed";
      return {
        status: "down",
        httpStatus: null,
        latencyMs: null,
        error: errorCode,
        responseUrl: null,
      };
    }

    if (REDIRECT_STATUS.has(response.status)) {
      const location = response.headers.get("location");
      response.body?.cancel();
      if (!location) {
        return {
          status: "down",
          httpStatus: response.status,
          latencyMs: null,
          error: "redirect_invalid",
          responseUrl: null,
        };
      }
      if (redirects >= options.maxRedirects) {
        return {
          status: "down",
          httpStatus: response.status,
          latencyMs: null,
          error: "redirect_exceeded",
          responseUrl: null,
        };
      }
      const nextUrl = new URL(location, currentUrl);
      const redirectValidation = validateUrl(nextUrl);
      if (!redirectValidation.ok) {
        const redirectError =
          redirectValidation.error === "invalid_protocol"
            ? "redirect_to_insecure"
            : redirectValidation.error === "blocked_private_ip" ||
              redirectValidation.error === "blocked_localhost"
            ? "redirect_to_private"
            : redirectValidation.error || "redirect_invalid";
        return {
          status: "down",
          httpStatus: response.status,
          latencyMs: null,
          error: redirectError,
          responseUrl: null,
        };
      }
      currentUrl = nextUrl;
      redirects += 1;
      continue;
    }

    if (method === "HEAD" && shouldFallbackToGet(response.status)) {
      response.body?.cancel();
      method = "GET";
      continue;
    }

    const latencyMs = Date.now() - startedAt;
    const httpStatus = response.status;
    response.body?.cancel();

    const status =
      httpStatus >= 500 || latencyMs >= options.slowThresholdMs ? "slow" : "up";

    return {
      status,
      httpStatus,
      latencyMs,
      error: null,
      responseUrl: currentUrl.toString(),
    };
  }
}
