"use client";
import { useMemo } from "react";
import { use } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { PendingOrderCard } from "@/components/orders/Cards";

function useTodayRange() {
  return useMemo(() => {
    const now = new Date();
    const from = new Date(now); from.setHours(0, 0, 0, 0);
    const to = new Date(now); to.setHours(23, 59, 59, 999);
    return { from: +from, to: +to };
  }, []);
}

export default function KitchenSlugPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const range = useTodayRange();
  const workshop = useQuery(api.workshops.getBySlug, { slug });
  const data = useQuery(api.orders.listByDate, { from: range.from, to: range.to });
  const all: any[] = (data?.pending as any[]) || [];
  const pending = workshop ? all.filter((o) => String(o.workshopId || "") === String(workshop._id)) : [];

  return (
    <div className="space-y-6 max-w-7xl mt-5 mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <Link href="/kitchen" className="text-sm text-gray-500 hover:underline">← Все цеха</Link>
          <h1 className="text-2xl font-bold">{workshop === undefined ? "Загрузка…" : workshop ? `Цех: ${workshop.name}` : "Цех не найден"}</h1>
        </div>
        <div className="text-sm text-gray-600">Всего: {pending.length}</div>
      </div>

      {workshop === null ? (
        <div className="text-sm text-gray-500">Цех со слагом «{slug}» не существует.</div>
      ) : (
        <Card className="border-0 pt-5 shadow-sm bg-gray-100">
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {pending.length === 0 && (
              <div className="text-sm text-gray-500 text-center py-6 col-span-full">Пусто</div>
            )}
            {pending.map((o) => (
              <PendingOrderCard key={o._id} order={o} />
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
