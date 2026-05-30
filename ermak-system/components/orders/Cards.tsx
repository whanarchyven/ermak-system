"use client";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CircleUserRound, MapPin, Phone, Wallet } from "lucide-react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { ElapsedBadge, RemainingBadge } from "./Badges";

export const cvaCardHeader = cva("flex rounded-t-md p-4 items-center justify-between",{
  variants: {
    status:{
      ok:"bg-green-500 text-white",
      warning:"bg-yellow-500 text-white",
      danger:"bg-red-500 text-white",
      default:"bg-white text-black",
    }
  },
});

function OrderExtras({ order }: { order: any }) {
  return (
    <>
      {order.pointsRedeemed > 0 && (
        <p className="text-xs font-medium text-amber-700">Списано баллов: −{order.pointsRedeemed} (скидка лояльности)</p>
      )}
      {order.workshopName && (
        <p className="text-xs text-gray-600">Цех: <span className="font-medium">{order.workshopName}</span></p>
      )}
    </>
  );
}

export function DefaultOrderCard({ order }: { order: any }) {
  return (
    <div className="rounded-md border flex flex-col gap-2 bg-white">
      <div className={cvaCardHeader({ status: "default" })}>
        <div className="flex items-center gap-2">
          <CircleUserRound className="size-5" />
          <p className="text-xl font-medium">{order.client.name || "Без имени"}</p>
        </div>
        {order.status === "completed" ? (
          <div className="text-sm text-gray-600">
            Завершён в {new Date(order.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </div>
        ) : (
          <ElapsedBadge createdAt={order.createdAt} />
        )}
      </div>
      <div className="p-4">
        <Badge variant="default" className="text-xs text-white">{order.type === 'delivery' ? 'Доставка' : order.type === 'restaurant' ? 'В ресторане' : 'Самовынос'}</Badge>
        <p className="text-sm font-medium underline">Данные клиента:</p>
        <div className="flex items-center gap-2">
          <Phone className="size-4" />
          <p className="text-sm  font-semibold">{order.client.phone}</p>
        </div>
        <div className="flex items-center gap-2">
          <Wallet className="size-4" />
          <p className="text-sm  font-semibold">{order.payment_method}</p>
        </div>
        {order.delivery && (
          <div className="flex items-center gap-2">
            <MapPin className="size-4" />
            <p className="text-sm  font-semibold">{order.delivery.address}</p>
          </div>
        )}
        <div className="flex border-t border-gray-200 pt-2 flex-col gap-2">
          <p className="text-sm font-medium">Данные заказа:</p>
          {order.positions.map((p: any) => (
            <p className="text-xs text-black font-semibold" key={p.id}>{p.name} x {p.quantity} = {p.lineTotal} ₽</p>
          ))}
          {order.discountTotal > 0 ? (
            <p className="text-md underline text-black font-semibold">
              Итого: <span className="line-through text-gray-500 mr-2">{order.subtotal} ₽</span> → {order.total} ₽
            </p>
          ) : (
            <p className="text-md underline text-black font-semibold">Итого: {order.total} ₽</p>
          )}
          {order.promocode && (
            <p className="text-xs text-gray-600">Промокод: <span className="font-medium">{order.promocode}</span></p>
          )}
          <OrderExtras order={order} />
        </div>
      </div>
    </div>
  );
}

function getPaymentMethod(method: string) {
  switch (method) {
    case "cash":
      return "Наличные";
    case "card":
      return "Безнал";
    case "online":
      return "Онлайн";
    default:
      return method;
  }
}

export function BacklogOrderCard({ order, products, menuPositions }: { order: any; products: any[]; menuPositions: any[] }) {
  const accept = useMutation(api.orders.acceptOrder);
  const reject = useMutation(api.orders.rejectOrder);
  const workshops = useQuery(api.workshops.list) || [];
  const [open, setOpen] = useState(false);
  const [estimateH, setEstimateH] = useState(0);
  const [estimateM, setEstimateM] = useState(15);
  const [workshopId, setWorkshopId] = useState<any>("");
  const [refused, setRefused] = useState<Record<string, boolean>>({});
  const shortages: Record<string, string[]> = {};
  for (const p of order.positions as any[]) {
    const mp = menuPositions.find((m) => m._id === p.id);
    const needs = (mp?.ingredients || []) as Array<{ productId: string; quantity: number }>;
    const missing: string[] = [];
    for (const need of needs) {
      const prod = products.find((pr) => pr._id === need.productId);
      const totalNeed = (need.quantity || 0) * (p.quantity || 0);
      if (!prod || (prod.estimate as number) < totalNeed) {
        const name = prod?.name || "Неизвестный продукт";
        const remain = prod?.estimate ?? 0;
        missing.push(`Не хватает "${name}". Необходимо: ${totalNeed}, Остаток: ${remain}`);
      }
    }
    if (missing.length) shortages[String(p.id)] = missing;
  }
  const onAccept = async () => {
    const mins = Math.max(0, estimateH * 60 + estimateM);
    await accept({ orderId: order._id, estimateMinutes: mins, workshopId: workshopId || undefined });
    setOpen(false);
    toast.success("Заказ принят и отправлен на кухню");
  };
  const onReject = async () => {
    const ids = Object.entries(refused).filter(([, v]) => v).map(([k]) => k) as any;
    await reject({ orderId: order._id, refusedPositionIds: ids });
    setOpen(false);
    toast.success("Заказ отклонён");
  };
  return (
    <div className="rounded-md border flex flex-col gap-2 p-4 bg-white">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CircleUserRound className="size-5" />
          <p className="text-xl font-medium">{order.client.name || "Без имени"}</p>
        </div>
        <ElapsedBadge createdAt={order.createdAt} />
      </div>
      <Badge variant="default" className="text-xs text-white">{order.type === 'delivery' ? 'Доставка' : order.type === 'restaurant' ? 'В ресторане' : 'Самовынос'}</Badge>
      <p className="text-sm font-medium underline">Данные клиента:</p>
      <div className="flex items-center gap-2">
        <Phone className="size-4" />
        <p className="text-sm  font-semibold">{order.client.phone}</p>
      </div>
      {order.delivery && (
        <div className="flex items-center gap-2">
          <MapPin className="size-4" />
          <p className="text-sm  font-semibold">{order.delivery.address}</p>
        </div>
      )}
      <div className="flex border-t border-gray-200 pt-2 flex-col gap-2">
        {order.positions.map((p: any) => (
          <div key={p.id} className="text-xs text-black font-semibold">
            {p.name} x {p.quantity} = {p.lineTotal} ₽
            {shortages[String(p.id)] && (
              <div className="mt-1 text-red-600 font-medium">
                {shortages[String(p.id)].map((m, i) => (
                  <div key={i}>{m}</div>
                ))}
              </div>
            )}
          </div>
        ))}
        {order.discountTotal > 0 ? (
          <p className="text-md underline text-black font-semibold">
            Итого: <span className="line-through text-gray-500 mr-2">{order.subtotal} ₽</span> → {order.total} ₽
          </p>
        ) : (
          <p className="text-md underline text-black font-semibold">Итого: {order.total} ₽</p>
        )}
        {order.promocode && (
          <p className="text-xs text-gray-600">Промокод: <span className="font-medium">{order.promocode}</span></p>
        )}
        <OrderExtras order={order} />
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="success">Принять заказ</Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Подтверждение заказа</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CircleUserRound className="size-5" />
                <p className="text-lg font-medium">{order.client.name || "Без имени"}</p>
              </div>
              <ElapsedBadge createdAt={order.createdAt} />
            </div>
            {order.delivery && (
              <div className="flex items-center gap-2">
                <MapPin className="size-4" />
                <p className="text-sm  font-semibold">{order.delivery.address}</p>
              </div>
            )}
            <div className="border-t pt-2 space-y-2">
              {order.positions.map((p: any) => (
                <label key={p.id} className="flex items-start gap-2 text-sm">
                  <input type="checkbox" className="mt-1" checked={!!refused[p.id]} onChange={(e) => setRefused((prev) => ({ ...prev, [p.id]: e.target.checked }))} />
                  <div className="flex-1">
                    <div className="font-medium">{p.name} x {p.quantity} = {p.lineTotal} ₽</div>
                    {shortages[String(p.id)] && (
                      <div className="mt-1 text-red-600 font-medium">
                        {shortages[String(p.id)].map((m, i) => (
                          <div key={i}>{m}</div>
                        ))}
                      </div>
                    )}
                  </div>
                </label>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm">Цех:</span>
              <select className="border rounded px-2 py-1 text-sm flex-1" value={workshopId} onChange={(e) => setWorkshopId(e.target.value)}>
                <option value="">— не выбран —</option>
                {(workshops as any[]).map((w) => (
                  <option key={w._id} value={w._id}>{w.name}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm">Время приготовления:</span>
              <input
                className="w-16 border rounded px-2 py-1 text-sm"
                type="number"
                min={0}
                value={estimateH}
                onChange={(e) => setEstimateH(Math.max(0, parseInt(e.target.value || "0")))}
              />
              <span className="text-sm">ч</span>
              <input
                className="w-16 border rounded px-2 py-1 text-sm"
                type="number"
                min={0}
                value={estimateM}
                onChange={(e) => setEstimateM(Math.max(0, parseInt(e.target.value || "0")))}
              />
              <span className="text-sm">м</span>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="destructive" onClick={onReject}>Отказать</Button>
            <Button onClick={onAccept}>Принять</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function PendingOrderCard({ order }: { order: any }) {
  const setPrepared = useMutation(api.orders.setPreparedPositions);
  const complete = useMutation(api.orders.completePending);
  const changeWorkshop = useMutation(api.orders.changeWorkshop);
  const workshops = useQuery(api.workshops.list) || [];
  const [open, setOpen] = useState(false);
  const [nowTick, setNowTick] = useState<number>(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const [prepared, setPreparedMap] = useState<Record<string, boolean>>(() => {
    const rec: Record<string, boolean> = {};
    for (const p of order.positions as any[]) rec[p.id] = !!p.prepared;
    return rec;
  });
  const allPrepared = (order.positions as any[]).every((p: any) => prepared[p.id]);
  const onSave = async () => {
    const list = Object.entries(prepared).map(([id, pr]) => ({ id, prepared: pr })) as any;
    await setPrepared({ orderId: order._id, prepared: list });
  };
  let status: "ok" | "warning" | "danger" | "default" = "default";
  if (order.acceptedAt && order.dueAt) {
    const total = Math.max(1, order.dueAt - order.acceptedAt);
    const remaining = Math.max(0, order.dueAt - nowTick);
    const ratio = remaining / total;
    if (ratio > 0.5) status = "ok";
    else if (ratio > 0.2) status = "warning";
    else status = "danger";
  }
  return (
    <div className="rounded-md border flex flex-col gap-2 bg-white">
      <div className={cvaCardHeader({ status })}>
        <div className="flex items-center gap-2">
          <CircleUserRound className="size-5" />
          <p className="text-xl font-medium">{order.client.name || "Без имени"}</p>
        </div>
        <RemainingBadge forceWhite={status !== "ok"} acceptedAt={order.acceptedAt} dueAt={order.dueAt} />
      </div>
      <div className="p-4">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="default" className="text-xs text-white">На кухне</Badge>
          <select
            className="border rounded px-2 py-0.5 text-xs"
            value={order.workshopId || ""}
            onChange={async (e) => { if (e.target.value) { const r: any = await changeWorkshop({ orderId: order._id, workshopId: e.target.value as any }); if (r?.ok) toast.success("Цех изменён"); else toast.error(r?.error || "Не удалось сменить цех"); } }}
          >
            <option value="">Цех: не выбран</option>
            {(workshops as any[]).map((w) => (
              <option key={w._id} value={w._id}>Цех: {w.name}</option>
            ))}
          </select>
        </div>
        <p className="text-sm font-medium underline">Данные клиента:</p>
        <div className="flex items-center gap-2">
          <Phone className="size-4" />
          <p className="text-sm  font-semibold">{order.client.phone}</p>
        </div>
        {order.delivery && (
          <div className="flex items-center gap-2">
            <MapPin className="size-4" />
            <p className="text-sm  font-semibold">{order.delivery.address}</p>
          </div>
        )}
        <div className="flex border-t border-gray-200 mb-4 pt-2 flex-col gap-2">
          {order.positions.map((p: any) => (
            <div key={p.id} className="flex items-center justify-between text-xs text-black font-semibold">
              <span>{p.name} x {p.quantity} = {p.lineTotal} ₽</span>
              <span className={cn("size-3 rounded-full", p.prepared ? "bg-emerald-600" : "bg-gray-300")} />
            </div>
          ))}
          {order.discountTotal > 0 ? (
            <p className="text-md underline text-black font-semibold">
              Итого: <span className="line-through text-gray-500 mr-2">{order.subtotal} ₽</span> → {order.total} ₽
            </p>
          ) : (
            <p className="text-md underline text-black font-semibold">Итого: {order.total} ₽</p>
          )}
          {order.promocode && (
            <p className="text-xs text-gray-600">Промокод: <span className="font-medium">{order.promocode}</span></p>
          )}
          <OrderExtras order={order} />
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">Редактировать</Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl">
              <DialogHeader>
                <DialogTitle>Отметьте готовые позиции</DialogTitle>
              </DialogHeader>
              <div className="space-y-2">
                {(order.positions as any[]).map((p: any) => (
                  <label key={p.id} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={!!prepared[p.id]} onChange={(e) => setPreparedMap((prev) => ({ ...prev, [p.id]: e.target.checked }))} />
                    <span>{p.name} x {p.quantity}</span>
                  </label>
                ))}
              </div>
              <DialogFooter className="gap-2">
                <Button onClick={onSave} variant="outline">Сохранить</Button>
                {allPrepared && (
                  <Button onClick={async () => { await onSave(); await complete({ orderId: order._id }); setOpen(false); toast.success("Заказ выдан"); }}>Выдать</Button>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}

export function ReadyOrderCard({ order }: { order: any }) {
  const complete = useMutation(api.orders.completeReady);
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-md border flex flex-col gap-2 p-4 bg-white">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CircleUserRound className="size-5" />
          <p className="text-xl font-medium">{order.client.name || "Без имени"}</p>
        </div>
        {order.readyAt && (
          <ElapsedBadge createdAt={order.readyAt} baseMs={60 * 60 * 1000} />
        )}
      </div>
      <Badge variant="default" className="text-xs text-white">Готово</Badge>
      <p className="text-sm font-medium underline">Данные клиента:</p>
      <div className="flex items-center gap-2">
        <Phone className="size-4" />
        <p className="text-sm  font-semibold">{order.client.phone}</p>
      </div>
      {order.delivery && (
        <div className="flex items-center gap-2">
          <MapPin className="size-4" />
          <p className="text-sm  font-semibold">{order.delivery.address}</p>
        </div>
      )}
      <div className="flex border-t border-gray-200 pt-2 flex-col gap-2">
        {order.positions.map((p: any) => (
          <div key={p.id} className="text-xs text-black font-semibold">
            {p.name} x {p.quantity} = {p.lineTotal} ₽
          </div>
        ))}
        {order.discountTotal > 0 ? (
          <p className="text-md underline text-black font-semibold">
            Итого: <span className="line-through text-gray-500 mr-2">{order.subtotal} ₽</span> → {order.total} ₽
          </p>
        ) : (
          <p className="text-md underline text-black font-semibold">Итого: {order.total} ₽</p>
        )}
        {order.promocode && (
          <p className="text-xs text-gray-600">Промокод: <span className="font-medium">{order.promocode}</span></p>
        )}
        <OrderExtras order={order} />
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="success">Выдать</Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Подтвердите получение оплаты {order.total} ₽</DialogTitle>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={async () => { await complete({ orderId: order._id }); setOpen(false); toast.success(`Заказ завершён, выручка +${order.total} ₽`); }}>Подтвердить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function DeliveryAssignCard({ order }: { order: any }) {
  const users = useQuery(api.users.list) || [] as any[];
  const assign = useMutation(api.orders.assignCourier);
  const courierAccept = useMutation(api.orders.courierAccept);
  const [open, setOpen] = useState(false);
  const couriers = users.filter((u: any) => u.role === 'courier');
  const [courierId, setCourierId] = useState<any>(couriers[0]?._id || "");
  const [now, setNow] = useState<number>(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const elapsedMs = Math.max(0, now - (order.readyAt || order.createdAt || 0));
  const mins = Math.floor(elapsedMs / 60000);
  const secs = Math.floor((elapsedMs % 60000) / 1000);
  const [delH, setDelH] = useState(0);
  const [delM, setDelM] = useState(30);
  return (
    <div className="rounded-md border flex flex-col gap-2 p-4 bg-white">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CircleUserRound className="size-5" />
          <p className="text-xl font-medium">{order.client.name || "Без имени"}</p>
        </div>
        <div className="text-sm text-gray-600">в статусе: {mins}:{secs.toString().padStart(2,'0')}</div>
      </div>
      <Badge variant="default" className="text-xs text-white">В доставке</Badge>
      <p className="text-sm font-medium underline">Данные клиента:</p>
      <div className="flex items-center gap-2">
        <Phone className="size-4" />
        <p className="text-sm  font-semibold">{order.client.phone}</p>
      </div>
      {order.delivery && (
        <div className="flex items-center gap-2">
          <MapPin className="size-4" />
          <p className="text-sm  font-semibold">{order.delivery.address}</p>
        </div>
      )}
      <div className="flex border-t border-gray-200 pt-2 flex-col gap-2">
        {order.positions.map((p: any) => (
          <div key={p.id} className="text-xs text-black font-semibold">
            {p.name} x {p.quantity} = {p.lineTotal} ₽
          </div>
        ))}
        {order.discountTotal > 0 ? (
          <p className="text-md underline text-black font-semibold">
            Итого: <span className="line-through text-gray-500 mr-2">{order.subtotal} ₽</span> → {order.total} ₽
          </p>
        ) : (
          <p className="text-md underline text-black font-semibold">Итого: {order.total} ₽</p>
        )}
        {order.promocode && (
          <p className="text-xs text-gray-600">Промокод: <span className="font-medium">{order.promocode}</span></p>
        )}
        <OrderExtras order={order} />
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="success">Выдать</Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Назначить курьера</DialogTitle>
          </DialogHeader>
          <div className="flex items-center gap-2">
            <select className="border rounded px-2 py-1" value={courierId} onChange={(e) => setCourierId(e.target.value)}>
              {couriers.map((c: any) => (
                <option key={c._id} value={c._id}>{c.fullName || c.username || c.email}</option>
              ))}
            </select>
          </div>
          {courierId && (
          <div className="flex items-center gap-2">
            <span className="text-sm">Время доставки:</span>
            <input className="w-16 border rounded px-2 py-1 text-sm" type="number" min={0} value={delH} onChange={(e) => setDelH(parseInt(e.target.value || '0'))} />
            <span className="text-sm">ч</span>
            <input className="w-16 border rounded px-2 py-1 text-sm" type="number" min={0} value={delM} onChange={(e) => setDelM(parseInt(e.target.value || '0'))} />
            <span className="text-sm">м</span>
          </div>
          )}
          <DialogFooter>
            <Button onClick={async () => { if (!courierId) return; await assign({ orderId: order._id, courierId }); toast.success("Курьер назначен"); }} disabled={!courierId || order.courierId === courierId}>Назначить</Button>
            <Button onClick={async () => { const mins = Math.max(0, delH * 60 + delM); await courierAccept({ orderId: order._id, deliveryMinutes: mins }); setOpen(false); toast.success("Заказ принят в доставку"); }}>Принял</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function DeliveryInProgressCard({ order }: { order: any }) {
  const complete = useMutation(api.orders.completeReady);
  const [open, setOpen] = useState(false);
  const [nowTick, setNowTick] = useState<number>(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const accepted = order.deliveryAcceptedAt || nowTick;
  const due = order.deliveryDue || nowTick;
  const total = Math.max(1, due - accepted);
  const remaining = Math.max(0, due - nowTick);
  const ratio = remaining / total;
  let status: "ok" | "warning" | "danger" | "default" = "default";
  if (order.deliveryAcceptedAt && order.deliveryDue) {
    if (ratio > 0.5) status = "ok";
    else if (ratio > 0.2) status = "warning";
    else status = "danger";
  }
  return (
    <div className="rounded-md border flex flex-col gap-2 bg-white">
      <div className={cvaCardHeader({ status })}>
        <div className="flex items-center gap-2">
          <CircleUserRound className="size-5" />
          <p className="text-xl font-medium">{order.client.name || "Без имени"}</p>
        </div>
        <RemainingBadge forceWhite={status !== "ok"} acceptedAt={order.deliveryAcceptedAt} dueAt={order.deliveryDue} />
      </div>
      <div className="p-4">
        <Badge variant="default" className="text-xs text-white">В доставке</Badge>
        <p className="text-sm font-medium underline">Данные клиента:</p>
        <div className="flex items-center gap-2">
          <Phone className="size-4" />
          <p className="text-sm  font-semibold">{order.client.phone}</p>
        </div>
        {order.delivery && (
          <div className="flex items-center gap-2">
            <MapPin className="size-4" />
            <p className="text-sm  font-semibold">{order.delivery.address}</p>
          </div>
        )}
        <div className="flex border-t border-gray-200 mb-4 pt-2 flex-col gap-2">
          {order.positions.map((p: any) => (
            <div key={p.id} className="text-xs text-black font-semibold">
              {p.name} x {p.quantity} = {p.lineTotal} ₽
              </div>
          ))}
        {order.discountTotal > 0 ? (
          <p className="text-md underline text-black font-semibold">
            Итого: <span className="line-through text-gray-500 mr-2">{order.subtotal} ₽</span> → {order.total} ₽
          </p>
        ) : (
          <p className="text-md underline text-black font-semibold">Итого: {order.total} ₽</p>
        )}
        {order.promocode && (
          <p className="text-xs text-gray-600">Промокод: <span className="font-medium">{order.promocode}</span></p>
        )}
        <OrderExtras order={order} />
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="success">Выдать</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Подтвердите получение {order.total} ₽</DialogTitle>
            </DialogHeader>
            <DialogFooter>
              <Button onClick={async () => { await complete({ orderId: order._id }); setOpen(false); toast.success(`Доставка завершена, выручка +${order.total} ₽`); }}>Подтвердить</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}


