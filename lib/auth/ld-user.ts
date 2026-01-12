type LdUser = {
  id: number;
  username: string;
  name?: string;
  avatar_template?: string;
  trust_level: number;
};

const DEFAULT_USER_ENDPOINT = "https://connect.linux.do/api/user";
const DEFAULT_USER_CACHE_SECONDS = 60 * 60;

export function getLdUserEndpoint() {
  return process.env.LD_OAUTH_USER_ENDPOINT || DEFAULT_USER_ENDPOINT;
}

export async function fetchLdUser(accessToken: string): Promise<LdUser> {
  const response = await fetch(getLdUserEndpoint(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`LD user fetch failed: ${response.status} ${errorText}`);
  }

  return (await response.json()) as LdUser;
}

export type { LdUser };

type CachedUserOptions = {
  maxAgeSeconds?: number;
  requireId?: boolean;
};

export async function getLdUserWithCache(params: {
  sessionId: string;
  options?: CachedUserOptions;
}): Promise<LdUser | null> {
  const { getSession, updateSessionUser } = await import(
    "@/lib/auth/session-store"
  );
  const session = await getSession(params.sessionId);
  if (!session) {
    return null;
  }

  const maxAgeSeconds = params.options?.maxAgeSeconds ?? DEFAULT_USER_CACHE_SECONDS;
  const requireId = params.options?.requireId ?? false;
  const cached = getCachedUser(session, { maxAgeSeconds, requireId });
  if (cached) {
    return cached;
  }

  const user = await fetchLdUser(session.accessToken);
  try {
    await updateSessionUser({
      sessionId: session.id,
      userId: user.id,
      username: user.username,
      trustLevel: user.trust_level,
      fetchedAt: new Date(),
    });
  } catch {
    // best-effort cache; ignore failures
  }
  return user;
}

function getCachedUser(
  session: {
    userId?: number | null;
    userUsername?: string | null;
    userTrustLevel?: number | null;
    userFetchedAt?: string | null;
  },
  options: { maxAgeSeconds: number; requireId: boolean }
): LdUser | null {
  if (!session.userUsername || session.userTrustLevel == null) {
    return null;
  }
  if (options.requireId && session.userId == null) {
    return null;
  }
  if (!session.userFetchedAt) {
    return null;
  }
  const fetchedAt = new Date(session.userFetchedAt).getTime();
  if (!Number.isFinite(fetchedAt)) {
    return null;
  }
  if (Date.now() - fetchedAt > options.maxAgeSeconds * 1000) {
    return null;
  }

  return {
    id: session.userId ?? 0,
    username: session.userUsername,
    trust_level: session.userTrustLevel,
  };
}
