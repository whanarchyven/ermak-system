"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/lib/convexApi";
import { useCustomer } from "@/lib/useCustomer";
import { Bell, Check } from "lucide-react";

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "только что";
  if (m < 60) return `${m} мин назад`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ч назад`;
  const d = Math.floor(h / 24);
  return `${d} дн назад`;
}

export default function NotificationsPage() {
  const { isAuthenticated } = useCustomer();
  const list = useQuery(api.notifications.myNotifications, isAuthenticated ? {} : "skip") as any[] | undefined;
  const markAllRead = useMutation(api.notifications.markAllRead);

  useEffect(() => {
    if (isAuthenticated) {
      const t = setTimeout(() => { markAllRead({}).catch(() => {}); }, 600);
      return () => clearTimeout(t);
    }
  }, [isAuthenticated, list?.length, markAllRead]);

  if (!isAuthenticated) {
    return (
      <div className="p-6 text-center text-neutral-500">
        <p>Войдите, чтобы видеть уведомления.</p>
        <Link href="/signin?redirect=/notifications" className="mt-3 inline-block rounded-full bg-[var(--bk-red)] px-5 py-2 font-bold text-white">Войти</Link>
      </div>
    );
  }

  return (
    <div className="px-4 py-5 md:py-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="flex items-center gap-2 text-2xl font-black text-[var(--bk-brown)]">
            <Bell className="h-6 w-6" /> Уведомления
          </h1>
          {(list?.length ?? 0) > 0 && (
            <button onClick={() => markAllRead({})} className="flex items-center gap-1 text-sm font-semibold text-[var(--bk-red)]">
              <Check className="h-4 w-4" /> Прочитать все
            </button>
          )}
        </div>

        {list === undefined && <div className="text-neutral-400">Загрузка…</div>}
        {list && list.length === 0 && (
          <div className="rounded-2xl bg-white p-8 text-center text-neutral-400 shadow-sm">Пока нет уведомлений</div>
        )}

        <div className="space-y-3">
          {list?.map((n) => {
            const body = (
              <div className={`rounded-2xl border p-4 shadow-sm transition-colors ${n.read ? "border-black/5 bg-white" : "border-[var(--bk-yellow)] bg-[var(--bk-yellow)]/15"}`}>
                <div className="flex items-start gap-3">
                  {!n.read && <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-[var(--bk-red)]" />}
                  <div className="flex-1">
                    <div className="font-bold text-[var(--bk-brown)]">{n.title}</div>
                    <div className="mt-0.5 text-sm text-neutral-600">{n.body}</div>
                    <div className="mt-1 text-xs text-neutral-400">{timeAgo(n.createdAt)}</div>
                  </div>
                </div>
              </div>
            );
            return n.url ? (
              <Link key={n._id} href={n.url}>{body}</Link>
            ) : (
              <div key={n._id}>{body}</div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
