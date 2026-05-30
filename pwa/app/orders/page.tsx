"use client";

import { useQuery } from "convex/react";
import Link from "next/link";
import { api } from "@/lib/convexApi";
import { rub, ORDER_STATUS_LABEL, ORDER_TYPE_LABEL } from "@/lib/format";
import { useCustomer } from "@/lib/useCustomer";
import BrandHeader from "@/components/BrandHeader";
import { ClipboardList } from "lucide-react";

const ACTIVE = new Set(["backlog", "accepted", "pending", "ready", "delivery", "delivery_pending"]);

const STATUS_STYLE: Record<string, string> = {
  backlog: "bg-neutral-200 text-neutral-700",
  accepted: "bg-blue-100 text-blue-700",
  pending: "bg-amber-100 text-amber-700",
  ready: "bg-green-100 text-green-700",
  delivery: "bg-indigo-100 text-indigo-700",
  delivery_pending: "bg-indigo-100 text-indigo-700",
  completed: "bg-neutral-100 text-neutral-500",
  cancelled: "bg-red-100 text-red-600",
  refund: "bg-red-100 text-red-600",
};

export default function OrdersPage() {
  const { isAuthenticated, isLoading } = useCustomer();
  const orders = useQuery(api.customer.myOrders, isAuthenticated ? {} : "skip") as any[] | undefined;

  if (isLoading) return <div className="p-6 text-center text-neutral-400">Загрузка…</div>;

  if (!isAuthenticated) {
    return (
      <div>
        <BrandHeader title="Мои заказы" />
        <div className="flex flex-col items-center gap-4 px-6 py-16 text-center">
          <ClipboardList className="h-14 w-14 text-neutral-300" />
          <div className="text-lg font-bold text-neutral-500">Войдите, чтобы видеть заказы</div>
          <Link href="/signin?redirect=/orders" className="rounded-full bg-[var(--bk-red)] px-6 py-3 font-black text-white">
            Войти
          </Link>
        </div>
      </div>
    );
  }

  const list = orders ?? [];
  const active = list.filter((o) => ACTIVE.has(o.status));
  const history = list.filter((o) => !ACTIVE.has(o.status));

  return (
    <div>
      <BrandHeader title="Мои заказы" subtitle="Статус обновляется в реальном времени" />
      <div className="space-y-6 px-4 py-4 md:mx-auto md:max-w-3xl">
        {list.length === 0 && <div className="py-10 text-center text-neutral-400">Заказов пока нет</div>}

        {active.length > 0 && (
          <section>
            <h2 className="mb-2 font-black text-[var(--bk-brown)]">Активные</h2>
            <div className="space-y-3">
              {active.map((o) => (
                <OrderCard key={o._id} order={o} />
              ))}
            </div>
          </section>
        )}

        {history.length > 0 && (
          <section>
            <h2 className="mb-2 font-black text-[var(--bk-brown)]">История</h2>
            <div className="space-y-3">
              {history.map((o) => (
                <OrderCard key={o._id} order={o} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function OrderCard({ order }: { order: any }) {
  const date = new Date(order.createdAt).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${STATUS_STYLE[order.status] ?? ""}`}>
          {ORDER_STATUS_LABEL[order.status] ?? order.status}
        </span>
        <span className="text-xs text-neutral-400">{date}</span>
      </div>
      <div className="mt-2 text-sm text-neutral-500">
        {ORDER_TYPE_LABEL[order.type] ?? order.type}
        {order.estimateMinutes ? ` · ~${order.estimateMinutes} мин` : ""}
      </div>
      <div className="mt-2 space-y-0.5 text-sm">
        {order.positions.map((p: any, i: number) => (
          <div key={i} className="flex justify-between">
            <span className="text-neutral-700">
              {p.name} × {p.quantity}
            </span>
            <span className="text-neutral-400">{rub(p.unitPrice * p.quantity)}</span>
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center justify-between border-t border-black/10 pt-2 font-black">
        <span>Итого</span>
        <span>{rub(order.total)}</span>
      </div>
      {(order.pointsEarned ?? 0) > 0 && (
        <div className="mt-1 text-xs font-bold text-[var(--bk-red)]">+{order.pointsEarned} баллов</div>
      )}
    </div>
  );
}
