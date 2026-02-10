"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AdminSidebar } from "@/features/admin/components/AdminSidebar";
import { AdminHeader } from "@/features/admin/components/AdminHeader";
import type { AdminRole } from "@/lib/admin/auth";

type AdminInfo = {
  userId: number;
  username: string;
  role: AdminRole;
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [admin, setAdmin] = useState<AdminInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    fetch("/api/admin/auth/me")
      .then((res) => {
        if (!res.ok) throw new Error("Forbidden");
        return res.json();
      })
      .then((data: AdminInfo) => setAdmin(data))
      .catch(() => router.replace("/"))
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50">
        <div className="text-sm text-neutral-500">加载中...</div>
      </div>
    );
  }

  if (!admin) return null;

  return (
    <div className="flex min-h-screen bg-neutral-50">
      <AdminSidebar role={admin.role} currentPath={pathname} />
      <div className="flex flex-1 flex-col min-w-0">
        <AdminHeader username={admin.username} role={admin.role} />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
