import { getSessionIdFromCookies } from "@/lib/auth/ld-oauth";
import { getSession } from "@/lib/auth/session-store";
import { getDevUserConfig } from "@/lib/auth/dev-user";

export type AdminRole = "admin" | "super_admin";

export type AdminUser = {
  userId: number;
  username: string;
  role: AdminRole;
};

type CookieStore = {
  get: (name: string) => { value: string } | undefined;
};

/**
 * 从请求 cookie 中获取当前管理员信息。
 * dev 模式下直接返回 super_admin，不查数据库。
 * 返回 null 表示未登录或非管理员。
 */
export async function getAdminUser(
  cookies: CookieStore
): Promise<AdminUser | null> {
  if (process.env.ENV === "dev") {
    const devUser = getDevUserConfig();
    return {
      userId: devUser.id,
      username: devUser.username,
      role: "super_admin",
    };
  }

  const sessionId = getSessionIdFromCookies(cookies);
  if (!sessionId) return null;

  const session = await getSession(sessionId);
  if (!session || !session.userId || !session.userUsername) return null;

  const { supabaseAdmin } = await import("@/lib/db/supabaseAdmin");

  const { data, error } = await supabaseAdmin
    .from("admin_users")
    .select("role")
    .eq("user_id", session.userId)
    .maybeSingle();

  if (error || !data) return null;

  const role = data.role as AdminRole;
  if (role !== "admin" && role !== "super_admin") return null;

  return { userId: session.userId, username: session.userUsername, role };
}

/**
 * 检查是否为超级管理员
 */
export function isSuperAdmin(admin: AdminUser): boolean {
  return admin.role === "super_admin";
}
