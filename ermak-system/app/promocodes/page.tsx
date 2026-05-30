"use client";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Percent } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function PromocodesPage() {
  const promos = useQuery(api.restaurant.listPromocodes) || [];
  const categories = useQuery(api.restaurant.listCategories) || [];
  const positions = useQuery(api.restaurant.listMenuPositions) || [];
  const create = useMutation(api.restaurant.createPromocode);
  const update = useMutation(api.restaurant.updatePromocode);
  const remove = useMutation(api.restaurant.deletePromocode);

  const emptyForm = { name: "", code: "", scope: "order" as const, type: "percent" as const, value: 10, categoryId: "", positionId: "", isActive: true, expiresAt: "", condThresholdEnabled: false, condThresholdValue: 0, condOrderTypeEnabled: false, condOrderType: "delivery" as const };
  const [form, setForm] = useState<any>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const onSave = async () => {
    try {
      if (!form.code) { alert("Введите код"); return; }
      if (editingId) {
        await update({ promoId: editingId as any, ...normalize(form) } as any);
      } else {
        await create(normalize(form) as any);
      }
      setForm(emptyForm); setEditingId(null); setDialogOpen(false);
    } catch (e: any) { alert(e?.message || "Ошибка"); }
  };

  const onEdit = (p: any) => {
    setEditingId(String(p._id));
    setForm({
      name: p.name || "",
      code: p.code || "",
      scope: p.scope,
      type: p.type,
      value: p.value,
      categoryId: p.categoryId || "",
      positionId: p.positionId || "",
      isActive: p.isActive,
      expiresAt: p.expiresAt ? new Date(p.expiresAt).toISOString().slice(0,16) : "",
      condThresholdEnabled: !!p.condThresholdEnabled,
      condThresholdValue: p.condThresholdValue || 0,
      condOrderTypeEnabled: !!p.condOrderTypeEnabled,
      condOrderType: p.condOrderType || "delivery",
    });
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6 max-w-7xl mt-5 mx-auto">
      <Card>
        <CardHeader className="bg-zinc-800 text-white">
          <div className="flex items-center gap-4 justify-between">
          <CardTitle className="text-xl"><div className="flex items-center gap-4"> Промокоды<Percent className="size-7" /></div>   </CardTitle>
          <div className="flex items-center justify-between">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-white text-black hover:bg-white/90" onClick={() => { setEditingId(null); setForm(emptyForm); }}>Добавить</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{editingId ? "Редактировать" : "Создать"} промокод</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-3 gap-3">
                  <Input placeholder="Название" value={form.name} onChange={(e) => setForm((s: any) => ({ ...s, name: e.target.value }))} />
                  <Input placeholder="Код" value={form.code} onChange={(e) => setForm((s: any) => ({ ...s, code: e.target.value.trim().toUpperCase() }))} />
                  <Select value={form.scope} onValueChange={(v) => setForm((s: any) => ({ ...s, scope: v }))}>
                    <SelectTrigger><SelectValue placeholder="Область" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="order">На чек</SelectItem>
                      <SelectItem value="category">На категорию</SelectItem>
                      <SelectItem value="position">На блюдо</SelectItem>
                    </SelectContent>
                  </Select>

                  {form.scope === "category" && (
                    <Select value={form.categoryId} onValueChange={(v) => setForm((s: any) => ({ ...s, categoryId: v }))}>
                      <SelectTrigger><SelectValue placeholder="Категория" /></SelectTrigger>
                      <SelectContent>
                        {categories.map((c: any) => (<SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  )}

                  {form.scope === "position" && (
                    <div className="col-span-3 flex items-start gap-3">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline">{(() => {
                            const found = positions.find((p: any) => String(p._id) === String(form.positionId || ""));
                            return found ? `Блюдо: ${found.name}` : "Выбрать блюдо";
                          })()}</Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[560px] p-2">
                          <div className="flex items-center gap-2 mb-2">
                            <Input placeholder="Поиск блюда..." value={form.__search || ""} onChange={(e) => setForm((s: any) => ({ ...s, __search: e.target.value }))} />
                          </div>
                          <div className="max-h-80 overflow-auto space-y-2">
                            {positions
                              .filter((p: any) => (form.__search ? (p.name?.toLowerCase().includes(String(form.__search).toLowerCase())) : true))
                              .map((p: any) => (
                                <button key={p._id} className="w-full flex items-center gap-3 p-2 rounded hover:bg-gray-50 text-left" onClick={() => setForm((s: any) => ({ ...s, positionId: p._id }))}>
                                  {p.photo && (<img src={p.photo} alt={p.name} className="w-12 h-12 object-cover rounded" />)}
                                  <div className="flex-1">
                                    <div className="font-medium">{p.name}</div>
                                    <div className="text-xs text-gray-600">{p.price} ₽</div>
                                  </div>
                                </button>
                              ))}
                          </div>
                        </PopoverContent>
                      </Popover>
                      {form.positionId && (() => { const f = positions.find((p: any) => String(p._id) === String(form.positionId)); if (!f) return null; return (
                        <div className="flex items-center gap-3 border rounded p-2">
                          {f.photo && (<img src={f.photo} alt={f.name} className="w-12 h-12 object-cover rounded" />)}
                          <div>
                            <div className="font-medium">{f.name}</div>
                            <div className="text-xs text-gray-600">{f.price} ₽</div>
                          </div>
                        </div>
                      ); })()}
                    </div>
                  )}

                  <Select value={form.type} onValueChange={(v) => setForm((s: any) => ({ ...s, type: v }))}>
                    <SelectTrigger><SelectValue placeholder="Тип скидки" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percent">Процент</SelectItem>
                      <SelectItem value="fixed">Фикс</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input type="number" placeholder="Значение" value={form.value} onChange={(e) => setForm((s: any) => ({ ...s, value: Number(e.target.value || 0) }))} />

                  <div className="col-span-3 grid grid-cols-3 gap-3 border-t pt-3">
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={!!form.condThresholdEnabled} onChange={(e) => setForm((s: any) => ({ ...s, condThresholdEnabled: e.target.checked }))} />
                      Порог (сумма от)
                    </label>
                    <Input type="number" placeholder="Порог" value={form.condThresholdValue} onChange={(e) => setForm((s: any) => ({ ...s, condThresholdValue: Number(e.target.value || 0) }))} />
                    <div />

                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={!!form.condOrderTypeEnabled} onChange={(e) => setForm((s: any) => ({ ...s, condOrderTypeEnabled: e.target.checked }))} />
                      Тип заказа
                    </label>
                    <Select value={form.condOrderType} onValueChange={(v) => setForm((s: any) => ({ ...s, condOrderType: v }))}>
                      <SelectTrigger><SelectValue placeholder="Тип заказа" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="delivery">Доставка</SelectItem>
                        <SelectItem value="self-service">Самовывоз</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="col-span-3 flex items-center gap-2">
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={!!form.isActive} onChange={(e) => setForm((s: any) => ({ ...s, isActive: e.target.checked }))} />
                      Активен
                    </label>
                    <Input type="datetime-local" value={form.expiresAt} onChange={(e) => setForm((s: any) => ({ ...s, expiresAt: e.target.value }))} />
                    <Button onClick={onSave}>{editingId ? "Сохранить" : "Создать"}</Button>
                    <Button variant="outline" onClick={() => { setForm(emptyForm); setEditingId(null); setDialogOpen(false); }}>Отмена</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Название</TableHead>
                <TableHead>Код</TableHead>
                <TableHead>Область</TableHead>
                <TableHead>Тип</TableHead>
                <TableHead>Значение</TableHead>
                <TableHead>Условия</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {promos.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-sm text-gray-500">Нет промокодов</TableCell>
                </TableRow>
              )}
              {promos.map((p: any) => {
                const conds: string[] = [];
                if (p.condThresholdEnabled && p.condThresholdValue) conds.push(`Порог от ${p.condThresholdValue} ₽`);
                if (p.condOrderTypeEnabled && p.condOrderType) conds.push(`Тип заказа: ${mapOrderType(p.condOrderType)}`);
                const status = [p.isActive ? "Активен" : "Неактивен", p.expiresAt ? `до ${formatDate(p.expiresAt)}` : undefined].filter(Boolean).join(" • ");
                return (
                  <TableRow key={p._id}>
                    <TableCell className="font-medium whitespace-normal break-words max-w-[280px]">{p.name || "—"}</TableCell>
                    <TableCell>{p.code}</TableCell>
                    <TableCell>{mapScope(p.scope)}</TableCell>
                    <TableCell>{mapType(p.type)}</TableCell>
                    <TableCell>{p.type === "percent" ? `${p.value}%` : `${p.value} ₽`}</TableCell>
                    <TableCell className="text-sm text-gray-700 whitespace-normal break-words">{conds.length ? conds.join(", ") : "—"}</TableCell>
                    <TableCell className="text-sm">{status || "—"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center gap-2 justify-end">
                        <Button size="sm" variant="outline" onClick={() => onEdit(p)}>Редактировать</Button>
                        <Button size="sm" variant="destructive" onClick={async () => { if (confirm("Удалить промокод?")) await remove({ promoId: p._id }); }}>Удалить</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function normalize(form: any) {
  return {
    name: form.name || undefined,
    code: String(form.code || "").trim().toUpperCase(),
    scope: form.scope,
    type: form.type,
    value: Number(form.value || 0),
    categoryId: form.scope === "category" ? (form.categoryId || undefined) : undefined,
    positionId: form.scope === "position" ? (form.positionId || undefined) : undefined,
    condThresholdEnabled: !!form.condThresholdEnabled,
    condThresholdValue: form.condThresholdEnabled ? Number(form.condThresholdValue || 0) : undefined,
    condOrderTypeEnabled: !!form.condOrderTypeEnabled,
    condOrderType: form.condOrderTypeEnabled ? form.condOrderType : undefined,
    isActive: !!form.isActive,
    expiresAt: form.expiresAt ? new Date(form.expiresAt).getTime() : undefined,
  } as const;
}

function mapScope(s: string) {
  switch (s) {
    case "order": return "На чек";
    case "category": return "На категорию";
    case "position": return "На блюдо";
    default: return s;
  }
}

function mapType(t: string) {
  switch (t) {
    case "percent": return "Процент";
    case "fixed": return "Фикс";
    default: return t;
  }
}

function mapOrderType(t: string) {
  switch (t) {
    case "delivery": return "Доставка";
    case "self-service": return "Самовывоз";
    default: return t;
  }
}

function formatDate(ts: number) {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return "";
  }
}


