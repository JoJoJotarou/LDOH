"use client";

import type { AdminRole } from "@/lib/admin/auth";

export function AdminHeader({
  username,
  role,
}: {
  username: string;
  role: AdminRole;
}) {
  const roleLabel = role === "super_admin" ? "超级管理员" : "管理员";

  return (
    <header className="flex h-14 items-center justify-end border-b border-neutral-200 bg-white px-6">
      <div className="flex items-center gap-3">
        <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-600">
          {roleLabel}
        </span>
        <span className="text-sm text-neutral-700">{username}</span>
      </div>
    </header>
  );
}
