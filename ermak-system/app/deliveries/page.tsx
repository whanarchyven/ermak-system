"use client";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DeliveryInProgressCard } from "@/components/orders/Cards";

function useTodayRange() {
  return useMemo(() => {
    const now = new Date();
    const from = new Date(now); from.setHours(0, 0, 0, 0);
    const to = new Date(now); to.setHours(23, 59, 59, 999);
    return { from: +from, to: +to };
  }, []);
}

export default function DeliveriesPage() {
  const range = useTodayRange();
  const me = useQuery(api.users.me);
  const data = useQuery(api.orders.listByDate, { from: range.from, to: range.to });
  const mine = ((data?.delivery_pending as any[]) || []).filter((o) => String(o.courierId || "") === String(me?._id || ""));

  return (
    <div className="space-y-6 max-w-7xl mt-5 mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Доставки</h1>
        <div className="text-sm text-gray-600">Моих заказов: {mine.length}</div>
      </div>

      <Card className="border-0 pt-5 shadow-sm shadow-offset-2 bg-gray-100">
        <CardHeader className="bg-transparent border-0 py-0">
          <CardTitle className="text-xl">В пути</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-2">
          {mine.length === 0 && (
            <div className="text-sm text-gray-500 text-center py-6 col-span-3">Нет назначенных заказов</div>
          )}
          {mine.map((o) => (
            <DeliveryInProgressCard key={o._id} order={o} />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

// Используем общий DeliveryInProgressCard из components/orders/Cards


