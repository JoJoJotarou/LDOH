import { NextRequest, NextResponse } from "next/server";

const TOKEN_COOKIE_NAME = "ld_auth_session";
const DEFAULT_REFRESH_BUFFER_SECONDS = 120;
const DEFAULT_TOKEN_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

type OAuthTokenPayload = {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  tokenType: string;
};

function isAuthRequired() {
  return process.env.ENV !== "dev";
}

function normalizeReturnTo(pathname: string, search: string) {
  const combined = `${pathname}${search || ""}`;
  if (!combined.startsWith("/") || combined.startsWith("//")) {
    return "/";
  }
  return combined;
}

function getRefreshBufferSeconds() {
  const configured = Number(process.env.LD_OAUTH_REFRESH_BUFFER_SECONDS);
  if (Number.isFinite(configured) && configured >= 0) {
    return configured;
  }
  return DEFAULT_REFRESH_BUFFER_SECONDS;
}

function getTokenCookieMaxAge() {
  const configured = Number(process.env.LD_OAUTH_TOKEN_COOKIE_MAX_AGE);
  if (Number.isFinite(configured) && configured > 0) {
    return configured;
  }
  return DEFAULT_TOKEN_MAX_AGE_SECONDS;
}

function shouldRefreshToken(token: OAuthTokenPayload) {
  const now = Math.floor(Date.now() / 1000);
  return token.expiresAt <= now + getRefreshBufferSeconds();
}

async function getSession(sessionId: string) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return null;
  }
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/auth_sessions?id=eq.${encodeURIComponent(
      sessionId
    )}`,
    {
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "count=none",
    },
    }
  );
  if (!response.ok) {
    return null;
  }
  const data = (await response.json()) as Array<{
    id: string;
    access_token: string;
    refresh_token: string;
    token_type: string;
    access_expires_at: string;
    session_expires_at: string;
    user_id?: number | null;
  }>;
  if (!data || data.length === 0) return null;
  return data[0];
}

async function updateSession(sessionId: string, payload: {
  access_token: string;
  refresh_token: string;
  token_type: string;
  access_expires_at: string;
  session_expires_at: string;
}) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return null;
  }
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/auth_sessions?id=eq.${encodeURIComponent(
      sessionId
    )}`,
    {
    method: "PATCH",
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(payload),
    }
  );
  if (!response.ok) {
    return null;
  }
  const data = (await response.json()) as Array<{ id: string }>;
  return data?.[0] ?? null;
}

async function deleteSession(sessionId: string) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return;
  }
  await fetch(
    `${SUPABASE_URL}/rest/v1/auth_sessions?id=eq.${encodeURIComponent(
      sessionId
    )}`,
    {
    method: "DELETE",
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    }
  );
}

function shouldSkipPath(pathname: string) {
  if (pathname.startsWith("/_next")) return true;
  if (pathname.startsWith("/api/oauth")) return true;
  if (pathname.startsWith("/favicon")) return true;
  if (pathname.startsWith("/robots")) return true;
  if (pathname.startsWith("/sitemap")) return true;
  if (pathname.startsWith("/auth/login")) return true;
  return false;
}

function isAdminPath(pathname: string) {
  return pathname.startsWith("/admin") || pathname.startsWith("/api/admin");
}

async function checkIsAdmin(userId: number): Promise<boolean> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return false;
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/admin_users?user_id=eq.${encodeURIComponent(
      userId
    )}&select=user_id`,
    {
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "count=none",
      },
    }
  );
  if (!response.ok) return false;
  const data = (await response.json()) as Array<{ user_id: number }>;
  return Array.isArray(data) && data.length > 0;
}

async function refreshToken(
  token: OAuthTokenPayload
): Promise<OAuthTokenPayload | null> {
  if (!token.refreshToken) return null;
  const clientId = process.env.LD_OAUTH_CLIENT_ID || "";
  const clientSecret = process.env.LD_OAUTH_CLIENT_SECRET || "";
  const tokenEndpoint =
    process.env.LD_OAUTH_TOKEN_ENDPOINT || "https://connect.linux.do/oauth2/token";
  if (!clientId || !clientSecret) return null;

  const basicToken = btoa(`${clientId}:${clientSecret}`);
  const tokenBody = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: token.refreshToken,
  });

  const response = await fetch(tokenEndpoint, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicToken}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: tokenBody.toString(),
  });

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    token_type?: string;
  };
  if (!data.access_token) {
    return null;
  }

  const expiresIn = data.expires_in ?? 3600;
  const expiresAt = Math.floor(Date.now() / 1000) + expiresIn;
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || token.refreshToken,
    expiresAt,
    tokenType: data.token_type || "bearer",
  };
}

export async function middleware(request: NextRequest) {
  if (!isAuthRequired()) {
    return NextResponse.next();
  }

  const { pathname, search } = request.nextUrl;
  if (shouldSkipPath(pathname)) {
    return NextResponse.next();
  }

  const accept = request.headers.get("accept") || "";
  const isApiRequest = pathname.startsWith("/api");
  const isHtmlRequest = accept.includes("text/html");

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.next();
  }

  const tokenCookie = request.cookies.get(TOKEN_COOKIE_NAME)?.value;
  if (!tokenCookie) {
    if (isApiRequest) {
      return NextResponse.next();
    }
    const returnTo = normalizeReturnTo(pathname, search);
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("returnTo", returnTo);
    return NextResponse.redirect(loginUrl);
  }

  const sessionId = tokenCookie;
  const session = await getSession(sessionId);
  if (!session) {
    if (isApiRequest) {
      return NextResponse.next();
    }
    const returnTo = normalizeReturnTo(pathname, search);
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("returnTo", returnTo);
    return NextResponse.redirect(loginUrl);
  }

  const sessionExpiresAt = new Date(session.session_expires_at).getTime();
  if (Number.isFinite(sessionExpiresAt) && sessionExpiresAt <= Date.now()) {
    await deleteSession(sessionId);
    if (isApiRequest) {
      return NextResponse.next();
    }
    const returnTo = normalizeReturnTo(pathname, search);
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("returnTo", returnTo);
    return NextResponse.redirect(loginUrl);
  }

  const tokenPayload = {
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    tokenType: session.token_type,
    expiresAt: Math.floor(new Date(session.access_expires_at).getTime() / 1000),
  };

  if (shouldRefreshToken(tokenPayload)) {
    const refreshed = await refreshToken(tokenPayload);
    if (refreshed) {
      await updateSession(sessionId, {
        access_token: refreshed.accessToken,
        refresh_token: refreshed.refreshToken || tokenPayload.refreshToken || "",
        token_type: refreshed.tokenType,
        access_expires_at: new Date(
          refreshed.expiresAt * 1000
        ).toISOString(),
        session_expires_at: new Date(
          Date.now() + getTokenCookieMaxAge() * 1000
        ).toISOString(),
      });

      if (isAdminPath(pathname)) {
        const userId = session.user_id;
        if (!userId || !(await checkIsAdmin(userId))) {
          if (isApiRequest) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
          }
          return NextResponse.redirect(new URL("/", request.url));
        }
      }

      return NextResponse.next();
    }

    if (!isApiRequest && isHtmlRequest) {
      const returnTo = normalizeReturnTo(pathname, search);
      const refreshUrl = new URL("/api/oauth/refresh", request.url);
      refreshUrl.searchParams.set("redirect", returnTo);
      return NextResponse.redirect(refreshUrl);
    }
  }

  if (isAdminPath(pathname)) {
    const userId = session.user_id;
    if (!userId || !(await checkIsAdmin(userId))) {
      if (isApiRequest) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
