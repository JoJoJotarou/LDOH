"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Globe,
  Users,
  ShieldCheck,
  Bell,
  Settings,
  Flag,
} from "lucide-react";
import type { AdminRole } from "@/lib/admin/auth";

type NavItem = {
  label: string;
  href: string;
  icon: React.ReactNode;
  superOnly?: boolean;
};

const navItems: NavItem[] = [
  { label: "仪表盘", href: "/admin", icon: <LayoutDashboard size={18} /> },
  { label: "站点管理", href: "/admin/sites", icon: <Globe size={18} /> },
  {
    label: "用户管理",
    href: "/admin/users",
    icon: <Users size={18} />,
    superOnly: true,
  },
  {
    label: "管理员",
    href: "/admin/admins",
    icon: <ShieldCheck size={18} />,
    superOnly: true,
  },
  { label: "举报管理", href: "/admin/reports", icon: <Flag size={18} /> },
  { label: "通知管理", href: "/admin/notifications", icon: <Bell size={18} /> },
  {
    label: "系统配置",
    href: "/admin/settings",
    icon: <Settings size={18} />,
    superOnly: true,
  },
];

export function AdminSidebar({
  role,
  currentPath,
}: {
  role: AdminRole;
  currentPath: string;
}) {
  const router = useRouter();
  const isSuperAdmin = role === "super_admin";
  const visibleItems = navItems.filter(
    (item) => !item.superOnly || isSuperAdmin
  );

  return (
    <aside className="flex w-56 flex-col border-r border-neutral-200 bg-white">
      <div className="flex h-14 items-center border-b border-neutral-200 px-5">
        <Link
          href="/admin"
          className="text-base font-semibold text-neutral-900"
        >
          LDOH 管理后台
        </Link>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {visibleItems.map((item) => {
          const isActive =
            item.href === "/admin"
              ? currentPath === "/admin"
              : currentPath.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                isActive
                  ? "bg-neutral-100 font-medium text-neutral-900"
                  : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
              }`}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-neutral-200 px-3 py-3">
        <button
          onClick={() => router.push("/")}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-neutral-500 transition-colors hover:bg-neutral-50 hover:text-neutral-700"
        >
          ← 返回前台
        </button>
      </div>
    </aside>
  );
}
