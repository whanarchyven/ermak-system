"use client";
import { useMemo } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, CornerRightDown, MoveLeft, MoveRight, Wallet, Pizza, Workflow } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Warehouse } from "lucide-react";

function mapPayment(method?: string) {
  switch (method) {
    case "cash": return "Наличные";
    case "card": return "Безнал";
    case "online": return "Онлайн";
    default: return method || "—";
  }
}

function mapStatus(s?: string) {
  switch (s) {
    case "backlog": return "Новые";
    case "pending": return "На кухне";
    case "ready": return "Готово";
    case "delivery": return "Готово к доставке";
    case "delivery_pending": return "В доставке";
    case "completed": return "Завершено";
    case "cancelled": return "Отменено";
    default: return s || "—";
  }
}

function dt(ms?: number) {
  return typeof ms === "number" ? new Date(ms).toLocaleString() : "—";
}

export default function OrderDetailsPage() {
  const params = useParams<{ id: string }>();
  const id = (params?.id || "") as any;
  const details = useQuery(api.orders.getDetails as any, id ? { orderId: id } : "skip" as any) as any;

  const totals = useMemo(() => {
    if (!details) return null;
    const rows = details.positions || [];
    const sum = rows.reduce((a: number, r: any) => a + (r.lineTotal || 0), 0);
    return { lines: rows.length, sum };
  }, [details]);

  if (details === undefined) return null; // loading
  if (!details) return (
    <div className="max-w-7xl mt-5 mx-auto">
      <Card>
        <CardHeader><CardTitle>Заказ не найден</CardTitle></CardHeader>
      </Card>
    </div>
  );

  return (
    <div className="space-y-6 max-w-7xl mt-5 mx-auto">
      <h1 className="text-2xl font-bold mb-6">Информация о заказе</h1>
      <Card>
        <CardHeader className="bg-zinc-800 text-white">
          <CardTitle className="text-xl"><div className="flex items-center gap-4"> Заказ {String(details._id)} <Badge variant="default" className="ml-2">{mapStatus(details.status)}</Badge></div></CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1">
            <div className="text-sm text-gray-500">Клиент</div>
            <div className="font-medium">{details.client?.name || "—"}</div>
            <div className="text-sm">{details.client?.phone || "—"}</div>
          </div>
          <div className="space-y-1">
            <div className="text-sm text-gray-500">Оплата</div>
            <div className="font-medium">{mapPayment(details.payment_method)}</div>
            <div className="text-sm">Промокод: {details.promocode || "—"}</div>
          </div>
          <div className="space-y-1">
            <div className="text-sm text-gray-500">Доставка</div>
            <div className="font-medium">{details.type === "delivery" ? (details.address || "—") : "Не доставка"}</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="bg-zinc-800 text-white">
          <CardTitle className="text-xl"><div className="flex items-center gap-4"> Флоу заказа<Workflow className="size-7" /></div></CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-9 gap-4">
          <div className="flex border-2 rounded-xl items-center flex-col justify-center gap-2 col-span-2">
            <div className="text-xl font-bold  text-black">Создан</div>
            <Separator orientation="horizontal" className="w-full" />
            <div className="font-medium text-sm">{dt(details.createdAt)}</div>
          </div>
          <div className="flex items-center justify-center gap-2">
          <MoveRight className="size-16" />
          </div>
          <div className="flex border-2 rounded-xl items-center flex-col justify-center gap-2 col-span-2">
            <div className="text-xl font-bold  text-black">Принят</div>
            <Separator orientation="horizontal" className="w-full" />
            <div className="font-medium text-sm">{dt(details.acceptedAt)}</div>
            <Separator orientation="horizontal" className="w-full" />
            <p className="text-sm text-center">Готовность: {details.estimateMinutes ? `(≈ ${details.estimateMinutes} мин)` : ""}</p>
          </div>
          <div className="flex items-center justify-center gap-2">
          <MoveRight className="size-16" />
          </div>
          <div className="flex border-2 rounded-xl items-center flex-col justify-center gap-2 col-span-2">
            <div className="text-xl font-bold  text-black">К готовности</div>
            <Separator orientation="horizontal" className="w-full" />
            <div className="font-medium text-sm">{dt(details.dueAt)}</div>
          </div>
          <div className="flex items-center justify-center gap-2"> <MoveRight className="size-16" /></div>
          <div className="flex border-2 rounded-xl items-center flex-col justify-center gap-2 col-span-2">
            <div className="text-xl font-bold  text-black">Готов</div>
            <Separator orientation="horizontal" className="w-full" />
            <div className="font-medium text-sm">{dt(details.readyAt)}</div>
          </div>
          <div className="flex items-center justify-center gap-2">
                <MoveRight className="size-16" />
              </div>
          {details.type === "delivery" && (
            <>
              
              <div className="flex border-2 rounded-xl items-center flex-col justify-center gap-2 col-span-2">
                <div className="text-xl font-bold  text-black">Курьер принял</div>
                <Separator orientation="horizontal" className="w-full" />
                <div className="font-medium text-sm text-center">{dt(details.deliveryAcceptedAt)}</div>
                <Separator orientation="horizontal" className="w-full" />
                <p className="text-sm text-center">Срок доставки: {dt(details.deliveryDue)}</p>
              </div>
              <div className="flex items-center justify-center gap-2">
                <MoveRight className="size-16" />
              </div>
            </>
          )}
          <div className="flex border-2 rounded-xl items-center flex-col justify-center gap-2 col-span-2">
            <div className="text-xl font-bold  text-black">Завершён/обновлён</div>
            <Separator orientation="horizontal" className="w-full" />
            <div className="font-medium text-sm text-center">{dt(details.updatedAt)}</div>
          </div>
          
          
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="bg-zinc-800 text-white">
          <CardTitle className="text-xl"><div className="flex items-center gap-4"> Позиции заказа {totals ? `(${totals.lines} поз.)` : ""} <Pizza className="size-7" /></div></CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Блюдо</TableHead>
                <TableHead>Кол-во</TableHead>
                <TableHead>Цена</TableHead>
                <TableHead>Сумма</TableHead>
                <TableHead>Готово</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {details.positions.map((p: any) => (
                <TableRow key={p.id}>
                  <TableCell className="whitespace-normal break-words max-w-[300px]">{p.name}</TableCell>
                  <TableCell>{p.quantity}</TableCell>
                  <TableCell>{p.unitPrice} ₽</TableCell>
                  <TableCell>{p.lineTotal} ₽</TableCell>
                  <TableCell>{p.prepared ? "Да" : "Нет"}</TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell colSpan={3} className="text-right font-medium">Промежуточный итог</TableCell>
                <TableCell colSpan={2}>{details.subtotal} ₽</TableCell>
              </TableRow>
              <TableRow>
                <TableCell colSpan={3} className="text-right font-medium">Скидка</TableCell>
                <TableCell colSpan={2}>− {details.discountTotal} ₽</TableCell>
              </TableRow>
              {details.deliveryFee ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-right font-medium">Доставка</TableCell>
                  <TableCell colSpan={2}>{details.deliveryFee} ₽</TableCell>
                </TableRow>
              ) : null}
              <TableRow>
                <TableCell colSpan={3} className="text-right font-semibold">Итого</TableCell>
                <TableCell colSpan={2} className="font-semibold">{details.total} ₽</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="bg-zinc-800 text-white">
            <CardTitle className="text-xl"><div className="flex items-center gap-4"> Денежные транзакции <Wallet className="size-7" /></div></CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Дата</TableHead>
                  <TableHead>Банк</TableHead>
                  <TableHead>Тип</TableHead>
                  <TableHead>Сумма</TableHead>
                  <TableHead>Баланс</TableHead>
                  <TableHead>Комментарий</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {details.moneyTransactions.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center text-sm text-gray-500">Нет транзакций</TableCell></TableRow>
                )}
                {details.moneyTransactions.map((t: any) => (
                  <TableRow key={t._id} className={t.type === "minus" ? "bg-red-50" : "bg-green-50"}>
                    <TableCell>{dt(t.date)}</TableCell>
                    <TableCell>{t.bankName === "cash" ? "Наличные" : "Безнал"}</TableCell>
                    <TableCell>{t.type === "plus" ? "Плюс" : "Минус"}</TableCell>
                    <TableCell className="font-semibold">{t.amount} ₽</TableCell>
                    <TableCell className="font-semibold">{t.estimate} ₽</TableCell>
                    <TableCell className="whitespace-normal break-words max-w-[320px]">{t.comment || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="bg-zinc-800 text-white">
            <CardTitle className="text-xl"><div className="flex items-center gap-4"> Складские операции (по заказу) <Warehouse className="size-7" /></div></CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Дата</TableHead>
                  <TableHead>Продукт</TableHead>
                  <TableHead>Тип</TableHead>
                  <TableHead>Кол-во</TableHead>
                  <TableHead>Остаток</TableHead>
                  <TableHead>Комментарий</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {details.productTransactions.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center text-sm text-gray-500">Нет записей</TableCell></TableRow>
                )}
                {details.productTransactions.map((r: any) => (
                  <TableRow key={r._id}>
                    <TableCell>{dt(r.date)}</TableCell>
                    <TableCell>{r.productName || String(r.productId)}</TableCell>
                    <TableCell>{r.type === "minus" ? "Расход" : "Приход"}</TableCell>
                    <TableCell>{r.quantity}</TableCell>
                    <TableCell>{r.estimate}</TableCell>
                    <TableCell className="whitespace-normal break-words max-w-[320px]">{r.comment || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


