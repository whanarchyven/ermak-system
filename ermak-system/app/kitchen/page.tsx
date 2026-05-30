"use client";
import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
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

export default function KitchenPage() {
  const range = useTodayRange();
  const data = useQuery(api.orders.listByDate, { from: range.from, to: range.to });
  const workshops = useQuery(api.workshops.list) || [];
  const pending: any[] = (data?.pending as any[]) || [];

  return (
    <div className="space-y-6 max-w-7xl mt-5 mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">Кухня — все цеха</h1>
        <div className="text-sm text-gray-600">Всего: {pending.length}</div>
      </div>
      {(workshops as any[]).length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-gray-500">Доски цехов:</span>
          {(workshops as any[]).map((w) => {
            const count = pending.filter((o) => String(o.workshopId || "") === String(w._id)).length;
            return (
              <Link key={w._id} href={`/kitchen/${w.slug}`} className="text-sm px-3 py-1 rounded-full bg-zinc-800 text-white hover:bg-zinc-700">
                {w.name} ({count})
              </Link>
            );
          })}
        </div>
      )}

      <Card className="border-0 pt-5 shadow-sm shadow-offset-2 bg-gray-100">
        
        <CardContent className="grid grid-cols-3 gap-2">
          {pending.length === 0 && (
            <div className="text-sm text-gray-500 text-center py-6">Пусто</div>
          )}
          {pending.map((o) => (
            <PendingOrderCard key={o._id} order={o} />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

// Используем общий PendingOrderCard из components/orders/Cards


