"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@/lib/convexApi";
import { useCustomer } from "@/lib/useCustomer";

export default function NotificationBell({ className = "" }: { className?: string }) {
  const { isAuthenticated } = useCustomer();
  const count = useQuery(api.notifications.unreadCount, isAuthenticated ? {} : "skip") as number | undefined;
  const unread = count ?? 0;

  return (
    <Link
      href={isAuthenticated ? "/notifications" : "/signin?redirect=/notifications"}
      aria-label="Уведомления"
      className={`relative inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25 ${className}`}
    >
      <Bell className="h-5 w-5" />
      {unread > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--bk-yellow)] px-1 text-[10px] font-bold text-[var(--bk-brown)]">
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </Link>
  );
}
