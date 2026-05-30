"use client";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon, ChevronDown, CircleUserRound, MapPin, Phone, RussianRuble, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { cva } from "class-variance-authority";
import { Badge } from "@/components/ui/badge";
import { DefaultOrderCard, BacklogOrderCard as BacklogCard, PendingOrderCard as PendingCard, ReadyOrderCard as ReadyCard, DeliveryAssignCard as DeliveryAssign, DeliveryInProgressCard as DeliveryProgress } from "@/components/orders/Cards";
import { CreateManualOrderDialog } from "@/components/orders/CreateManualOrderDialog";

const COLUMNS = [
  { key: "backlog", title: "Новые",color: "blue"},
  { key: "pending", title: "На кухне",color: "orange"},
  { key: "ready", title: "Готовы",color: "green"},
  { key: "delivery", title: "Готово к доставке",color: "emerald"},
  { key: "delivery_pending", title: "В доставке",color: "emerald"},
  { key: "completed", title: "Завершено",color: "gray"},
] as const;

const cvaCardHeader = cva("flex rounded-t-md p-4 items-center justify-between",{
  variants: {
    status:{
      ok:"bg-green-500 text-white",
      warning:"bg-yellow-500 text-white",
      danger:"bg-red-500 text-white",
      default:"bg-white text-black",
    }
  },
});

const cvaColumn = cva("border-0 shadow-sm shadow-offset-2 bg-gray-100",{
  variants: {
    color: {
      blue: "shadow-red-400",
      orange: "shadow-[#ffae64]",
      green: "shadow-green-500",
      emerald: "shadow-blue-500",
      gray: "shadow-zinc-800",
    },
  },
});

const cvaColumnHeader = cva("bg-transparent border-0",{
  variants: {
    color: {
      blue: "bg-red-400",
      orange: "bg-[#ffae64]",
      green: "bg-green-500",
      emerald: "bg-blue-500",
      gray: "bg-zinc-800",
    },
  },
});
function useData(from: number, to: number) {
  const data = useQuery(api.orders.listByDate, { from, to });
  return {
    columns: data || { backlog: [], pending: [], ready: [], delivery: [], delivery_pending: [], completed: [] },
  };
}
 function getPaymentMethod(method: string) {
  switch (method) {
    case 'cash': return 'Наличные';
    case 'card': return 'Безнал';
    case 'online': return 'Онлайн';
    default: return method;
  }
}

export default function DashboardPage() {
  const today = new Date();
  const [date, setDate] = useState<Date>(today);
  const range = useMemo(() => {
    const from = new Date(date); from.setHours(0,0,0,0);
    const to = new Date(date); to.setHours(23,59,59,999);
    return { from: +from, to: +to };
  }, [date]);
  const { columns } = useData(range.from, range.to);
  const products = useQuery(api.warehouse.listProducts);
  const menuPositions = useQuery(api.restaurant.listMenuPositions);
  const users = useQuery(api.users.list);
  const me = users?.find((u: any) => u.email); // упрощенно: первый пользователь как текущий
  const openShift = useMutation(api.orders.openShift);
  

  return (
    <div className="space-y-6 max-w-7xl mt-5 mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Заказы  {new Date().toLocaleDateString()}</h1>
        <div className="flex items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-56 justify-between font-normal">
              <span className="flex items-center gap-2">
                <CalendarIcon className="size-4" />
                {date.toLocaleDateString()}
              </span>
              <ChevronDown className="size-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto overflow-hidden p-0" align="end">
            <Calendar mode="single" selected={date} captionLayout="dropdown" onSelect={(d) => d && setDate(d)} />
          </PopoverContent>
        </Popover>
        <CreateManualOrderDialog />

        </div>
      </div>

      <div className="space-y-4 flex flex-col gap-4">
        {me?.role === 'bartender' && (
          <div className="flex justify-end">
            <Button onClick={async () => { if (!me?._id) return; await openShift({ userId: me._id }); }}>Открыть смену</Button>
          </div>
        )}
        {COLUMNS.map((col) => (
          <Card key={String(col.key)} className={cvaColumn({ color: col.color })}>
            <CardHeader className={cvaColumnHeader({ color: col.color })}>
              <div className="flex items-center justify-between">
                <CardTitle className={"text-xl text-left font-bold text-white"}>{col.title}</CardTitle>
                <span className="text-white text-xl font-semibold">{((columns[col.key] as any[]) || []).length} заказов</span>
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-2">
              {(columns[col.key] as any[]).length === 0 && (
                <div className="text-sm text-gray-500 text-center py-6">Пусто</div>
              )}
              {(columns[col.key] as any[]).map((o: any) => (
                col.key === "backlog" ? (
                  <BacklogCard key={o._id} order={o} products={products || []} menuPositions={menuPositions || []} />
                ) : col.key === "pending" ? (
                  <PendingCard key={o._id} order={o} />
                ) : col.key === "ready" ? (
                  <ReadyCard key={o._id} order={o} />
                ) : col.key === "delivery" ? (
                  <DeliveryAssign key={o._id} order={o} />
                ) : col.key === "delivery_pending" ? (
                  // Эта ветка не используется в этом map — ниже отдельный групповой рендер
                  <></>
                ) : (
                  <DefaultOrderCard key={o._id} order={o} />
                )
              ))}

              {col.key === "delivery_pending" && (() => {
                const orders = (columns[col.key] as any[]) || [];
                // Группировка по курьеру
                const groups: Record<string, any[]> = {};
                for (const o of orders) {
                  const key = o.courierId ? String(o.courierId) : "__none__";
                  if (!groups[key]) groups[key] = [];
                  groups[key].push(o);
                }
                const entries = Object.entries(groups);
                if (entries.length === 0) return null;
                return entries.map(([courierId, list]) => {
                  const courier = (users || []).find((u: any) => String(u._id) === courierId);
                  const title = courier ? (courier.fullName || courier.username || courier.email || "Курьер") : "Без курьера";
    return (
                    <div key={courierId} className="col-span-3">
                      <div className="text-xl font-semibold text-gray-700 mb-2">{title}</div>
                      <div className="grid grid-cols-3 gap-2">
                        {list.map((o: any) => (
                          <DeliveryProgress key={o._id} order={o} />
                        ))}
                      </div>
                    </div>
                  );
                });
              })()}
            </CardContent>
          </Card>
        ))}
      </div>
      </div>
    );
  }















