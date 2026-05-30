"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function CreateManualOrderDialog() {
  const products = useQuery(api.warehouse.listProducts) || [];
  const menuPositions = useQuery(api.restaurant.listMenuPositions) || [];
  const categories = useQuery(api.restaurant.listCategories) || [];
  const setTempPositions = useMutation(api.orders.setTempPositions);
  const setTempClient = useMutation(api.orders.setTempClient);
  const setOrderTypeMut = useMutation(api.orders.setOrderType);
  const setAddressMut = useMutation(api.orders.setAddress);
  const setPaymentMethodMut = useMutation(api.orders.setPaymentMethod);
  const confirmOrder = useMutation(api.orders.confirmOrder);
  const createClient = useMutation(api.clients.create);

  const [open, setOpen] = useState(false);
  const [menuSearch, setMenuSearch] = useState("");
  const [categoryId, setCategoryId] = useState<string | "all">("all");
  const [items, setItems] = useState<Record<string, number>>({});
  const [clientPhone, setClientPhone] = useState("");
  const foundClients = useQuery(api.clients.findByPhone, { phone: clientPhone || "" }) || [];
  const found = (foundClients as any[])[0];
  const [clientName, setClientName] = useState("");
  const [clientId, setClientId] = useState<string | null>(null);
  const [orderType, setOrderType] = useState<"restaurant" | "self-service" | "delivery">("restaurant");
  const [address, setAddress] = useState("");
  const [payment, setPayment] = useState<"cash" | "card" | "online">("cash");

  function getTypeLabel(t: "restaurant" | "self-service" | "delivery") {
    return t === "delivery" ? "Доставка" : t === "self-service" ? "Самовывоз" : "В ресторане";
  }
  function getPaymentLabel(p: "cash" | "card" | "online") {
    return p === "cash" ? "Наличные" : p === "card" ? "Безнал" : "Онлайн";
  }

  const selectedItems = useMemo(() => Object.entries(items).filter(([, q]) => (q as number) > 0), [items]);
  const summary = useMemo(() => {
    let subtotal = 0;
    const lines: Array<{ name: string; qty: number; line: number }> = [];
    for (const [id, q] of selectedItems) {
      const pos = menuPositions.find((p: any) => String(p._id) === id);
      if (!pos) continue;
      const unit = pos.discountPrice ?? pos.price;
      const line = unit * (q as number);
      subtotal += line;
      lines.push({ name: pos.name, qty: q as number, line });
    }
    return { subtotal, lines };
  }, [selectedItems, menuPositions]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default">Создать заказ</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-6xl flex flex-col h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Создать заказ вручную</DialogTitle>
        </DialogHeader>
        <div className="">
          <Tabs defaultValue="menu" className="flex-1 flex flex-col">
            <TabsList className="grid grid-cols-4 gap-3 overflow-auto shrink-0">
              <TabsTrigger value="menu">Меню</TabsTrigger>
              <TabsTrigger value="client">Клиент</TabsTrigger>
              <TabsTrigger value="order">Заказ</TabsTrigger>
              <TabsTrigger value="summary">Итого</TabsTrigger>
            </TabsList>
            <div className="flex-1 overflow-auto">
              <TabsContent value="menu" className="space-y-3">
                <div className="flex gap-2 items-center">
                  <Input placeholder="Поиск..." value={menuSearch} onChange={(e) => setMenuSearch(e.target.value)} className="w-64" />
                  <Select value={categoryId} onValueChange={(v) => setCategoryId(v as any)}>
                    <SelectTrigger className="w-64"><SelectValue placeholder="Категория" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Все категории</SelectItem>
                      {categories.map((c: any) => (
                        <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 gap-3 overflow-auto">
                  {menuPositions
                    .filter((p: any) => (categoryId === "all" ? true : String(p.categoryId) === String(categoryId)))
                    .filter((p: any) => (menuSearch ? (p.name?.toLowerCase().includes(menuSearch.toLowerCase())) : true))
                    .map((p: any) => {
                      const qty = items[String(p._id)] || 0;
                      const shortages: Array<string> = [];
                      if (qty > 0 && Array.isArray(p.ingredients)) {
                        for (const ing of p.ingredients as Array<{ productId: string; quantity: number }>) {
                          const prod = (products || []).find((pr: any) => String(pr._id) === String(ing.productId));
                          const required = (ing?.quantity || 0) * qty;
                          const available = (prod?.estimate as number | undefined) ?? 0;
                          if (!prod || available < required) {
                            const unit = (prod?.unit as string | undefined) ?? "";
                            shortages.push(`Не хватает: ${prod?.name ?? "продукт"} — нужно ${required} ${unit}, остаток ${available} ${unit}`);
                          }
                        }
                      }
                      return (
                        <div key={p._id} className="border rounded-md bg-white p-2 flex flex-col gap-2">
                          {p.photo && (<img src={p.photo} alt={p.name} className="w-full h-28 object-cover rounded" />)}
                          <div className="font-medium">{p.name}</div>
                          <div className="text-sm text-gray-600 line-clamp-2">{p.structure}</div>
                          <div className="font-semibold">{p.price} ₽</div>
                          {shortages.length > 0 && (
                            <div className="text-xs text-red-600 font-medium space-y-1">
                              {shortages.map((s, i) => (<div key={i}>{s}</div>))}
                            </div>
                          )}
                          {qty === 0 ? (
                            <Button size="sm" onClick={() => setItems((s) => ({ ...s, [p._id]: 1 }))}>Добавить</Button>
                          ) : (
                            <div className="flex items-center gap-2">
                              <Button size="icon" variant="outline" onClick={() => setItems((s) => ({ ...s, [p._id]: Math.max(0, (s[p._id]||0)-1) }))}>-</Button>
                              <div className="w-8 text-center">{qty}</div>
                              <Button size="icon" variant="outline" onClick={() => setItems((s) => ({ ...s, [p._id]: (s[p._id]||0)+1 }))}>+</Button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </TabsContent>
              <TabsContent value="client" className="space-y-3">
                <div className="flex gap-2 items-end">
                  <Input placeholder="Телефон" value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} className="w-64" />
                  <Button onClick={() => { if (found) { setClientId(String(found._id)); const preferredName = (found.name_pool && found.name_pool[0]) || found.name || ""; setClientName(preferredName); } }}>Найти</Button>
                </div>
                <div className="flex gap-2 items-center">
                  <Input placeholder="Имя" value={clientName} onChange={(e) => setClientName(e.target.value)} className="w-64" />
                </div>
                <div className="text-xs text-gray-500">Если клиента нет — будет создан новый (без Telegram).</div>
              </TabsContent>
              <TabsContent value="order" className="space-y-3">
                <div className="flex gap-3 items-center">
                  <Select value={orderType} onValueChange={(v) => setOrderType(v as any)}>
                    <SelectTrigger className="w-64"><SelectValue placeholder="Тип заказа" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="restaurant">В ресторане</SelectItem>
                      <SelectItem value="self-service">Самовывоз</SelectItem>
                      <SelectItem value="delivery">Доставка</SelectItem>
                    </SelectContent>
                  </Select>
                  {orderType === "delivery" && (
                    <div className="flex items-center gap-2">
                      {found?.address_pool?.length ? (
                        <Select onValueChange={(v) => setAddress(v)}>
                          <SelectTrigger className="w-[320px]"><SelectValue placeholder="Выберите адрес из адресной книги" /></SelectTrigger>
                          <SelectContent>
                            {(found.address_pool as any[]).map((a: any, idx: number) => (
                              <SelectItem key={idx} value={a.address}>{a.address}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : null}
                      <Input placeholder="Адрес" value={address} onChange={(e) => setAddress(e.target.value)} className="w-[420px]" />
                    </div>
                  )}
                  <Select value={payment} onValueChange={(v) => setPayment(v as any)}>
                    <SelectTrigger className="w-48"><SelectValue placeholder="Оплата" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Наличные</SelectItem>
                      <SelectItem value="card">Безнал</SelectItem>
                      <SelectItem value="online">Онлайн</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>
              <TabsContent value="summary" className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <Card>
                    <CardHeader>
                      <CardTitle>Меню</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1">
                      {summary.lines.length === 0 && (
                        <div className="text-sm text-gray-500">Пусто</div>
                      )}
                      {summary.lines.map((l, idx) => (
                        <div key={idx} className="text-sm flex items-center justify-between">
                          <span>{l.name}</span>
                          <span className="tabular-nums">x {l.qty}</span>
                          <span className="font-medium tabular-nums">{l.line} ₽</span>
                        </div>
                      ))}
                      <div className="border-t mt-2 pt-2 flex items-center justify-between">
                        <span className="text-sm">Сумма</span>
                        <span className="font-semibold tabular-nums">{summary.subtotal} ₽</span>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle>Клиент</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1">
                      <div className="text-sm"><span className="text-gray-500">Имя:</span> {clientName || "-"}</div>
                      <div className="text-sm"><span className="text-gray-500">Телефон:</span> {clientPhone || "-"}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle>Заказ</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1">
                      <div className="text-sm"><span className="text-gray-500">Тип:</span> {getTypeLabel(orderType)}</div>
                      {orderType === 'delivery' && (
                        <div className="text-sm"><span className="text-gray-500">Адрес:</span> {address || "-"}</div>
                      )}
                      <div className="text-sm"><span className="text-gray-500">Оплата:</span> {getPaymentLabel(payment)}</div>
                    </CardContent>
                  </Card>
                </div>
                <DialogFooter>
                  <Button onClick={async () => {
                    let usedClientId = clientId as any;
                    if (!usedClientId) {
                      usedClientId = await createClient({ name: clientName || undefined, phone: clientPhone || undefined } as any);
                      setClientId(String(usedClientId));
                    }
                    const arr = Object.entries(items).filter(([, q]) => (q as number) > 0).map(([id, q]) => ({ menuPositionId: id as any, quantity: q as number }));
                    await setTempPositions({ clientId: usedClientId, items: arr as any });
                    await setTempClient({ clientId: usedClientId, name: clientName || undefined, phone: clientPhone || undefined });
                    await setOrderTypeMut({ clientId: usedClientId, type: orderType });
                    if (orderType === 'delivery' && address) {
                      await setAddressMut({ clientId: usedClientId, address });
                    }
                    await setPaymentMethodMut({ clientId: usedClientId, method: payment });
                    const res2 = await confirmOrder({ clientId: usedClientId });
                    if (!(res2 as any)?.ok) { alert((res2 as any)?.error || "Ошибка"); return; }
                    setItems({}); setClientPhone(""); setClientName(""); setClientId(null); setOrderType("restaurant"); setAddress(""); setPayment("cash");
                    setOpen(false);
                  }}>Создать заказ</Button>
                </DialogFooter>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}


