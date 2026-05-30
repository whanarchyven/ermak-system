"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
// import { FormInput } from "@/components/ui/form-input";
import { useProducts } from "../../features/warehouse";
import { Id } from "../../convex/_generated/dataModel";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MoreHorizontal, Package } from "lucide-react";
import { DropdownMenu, DropdownMenuItem, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";

export default function WarehousePage() {
  const {
    products,
    handleDelete,
    handleAdjust,
    adjustQty,
    setAdjustQty,
    adjustComment,
    setAdjustComment,
  } = useProducts();

  const [activeAdjust, setActiveAdjust] = useState<{ productId: Id<"products">; type: "plus" | "minus" } | null>(null);
  const [search, setSearch] = useState("");
  const [onlyLow, setOnlyLow] = useState(false);
  const [adjustBank, setAdjustBank] = useState<"cash" | "card">("card");
  const [adjustError, setAdjustError] = useState<string>("");
  const adjustDirect = useMutation(api.warehouse.adjustEstimate);
  const bankStats = useQuery(api.transactions.stats);
  const [expiryDate, setExpiryDate] = useState<string>("");
  const expiryMs = useMemo(() => expiryDate ? new Date(expiryDate).getTime() : undefined, [expiryDate]);
  const expirySummary = useQuery(api.warehouse.listExpirySummary as any, expiryMs ? { until: expiryMs } : "skip" as any) || [];

  const filtered = useMemo(() => {
    let list = products || [];
    if (search.trim()) {
      const s = search.trim().toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(s));
    }
    if (onlyLow) {
      list = list.filter((p) => p.estimate < p.safeEstimate);
    }
    return list;
  }, [products, search, onlyLow]);

  // Пагинация
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil((filtered?.length || 0) / pageSize));
  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page]);

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Склад / Продукты</h1>
        <Button asChild>
          <Link href="/warehouse/create">Создать продукт</Link>
        </Button>
      </div>

      <Card>
        <CardHeader className="bg-zinc-800 text-white">
          <CardTitle className="text-xl"><div className="flex items-center gap-4"> Продукты<Package className="size-7" /></div>   </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="text-sm">Просрочка до:</div>
            <Input type="datetime-local" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} className="w-64" />
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <Input placeholder="Поиск по названию" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
            <label className="inline-flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={onlyLow} onChange={(e) => setOnlyLow(e.target.checked)} />
              Показывать только ниже безопасного остатка
            </label>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Название</TableHead>
                <TableHead>Ед.</TableHead>
                <TableHead>Цена</TableHead>
                <TableHead>Остаток</TableHead>
                <TableHead>Безопасный</TableHead>
                <TableHead>Просрочка</TableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageItems.map((p) => {
                const isLow = p.estimate < p.safeEstimate;
                const expRow = (expirySummary as any[]).find((r) => String(r.productId) === String(p._id));
                return (
                  <TableRow key={p._id} className={isLow ? 'bg-red-50' : ''}>
                    <TableCell className="font-bold">{p.name}</TableCell>
                    <TableCell>{p.unit}</TableCell>
                    <TableCell>за {p.priceBaseQty} {p.unit} = {p.priceForBase} ₽</TableCell>
                    <TableCell className="font-bold"><Badge variant={isLow ? "destructive" : "default"}>{p.estimate} {p.unit}</Badge></TableCell>
                    <TableCell>{p.safeEstimate}</TableCell>
                    <TableCell>
                      {expiryMs ? (
                        expRow && expRow.totalExpired > 0 ? (
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-red-700">{expRow.totalExpired} {p.unit}</span>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="size-4 text-gray-600" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <div className="space-y-1">
                                  {expRow.breakdown.map((b: any, i: number) => (
                                    <div key={i}>{new Date(b.expiresAt).toLocaleDateString()}: {b.quantity} {p.unit}</div>
                                  ))}
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        ) : (
                          <span className="text-gray-500">—</span>
                        )
                      ) : (
                        <span className="text-gray-500">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap justify-end gap-2">
                        <Popover
                          open={activeAdjust?.productId === p._id && activeAdjust?.type === "plus"}
                          onOpenChange={(o) => setActiveAdjust(o ? { productId: p._id, type: "plus" } : null)}
                        >
                          <PopoverTrigger asChild>
                            <Button size="sm" variant="success">+</Button>
                          </PopoverTrigger>
                          <PopoverContent align="end" className="w-[420px]">
                            <div className="space-y-2">
                              <div className="text-sm font-medium">Приход</div>
                              <div className="flex flex-wrap gap-2">
                                <Input
                                  type="number"
                                  placeholder="Кол-во"
                                  value={adjustQty || ""}
                                  onChange={(e) => setAdjustQty(parseFloat(e.target.value) || 0)}
                                  className="w-28"
                                />
                                <Input
                                  placeholder="Комментарий"
                                  value={adjustComment}
                                  onChange={(e) => setAdjustComment(e.target.value)}
                                  className="min-w-60"
                                />
                                <div className="w-full flex items-center gap-2">
                                  <div className="text-xs text-gray-600">Банк:</div>
                                  <Select value={adjustBank} onValueChange={(v) => { setAdjustBank(v as any); setAdjustError(""); }}>
                                    <SelectTrigger className="w-40">
                                      <SelectValue placeholder="Банк" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="cash">Наличные</SelectItem>
                                      <SelectItem value="card">Безнал</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  {adjustQty > 0 && (() => {
                                    const unit = (p.priceForBase / Math.max(1, p.priceBaseQty));
                                    const amount = (unit * adjustQty) || 0;
                                    const available = adjustBank === 'cash' ? (bankStats?.cash ?? 0) : (bankStats?.card ?? 0);
                                    const insufficient = amount > available;
                                    return (
                                      <div className={"text-xs ml-auto " + (insufficient ? "text-red-600 font-medium" : "text-gray-700")}>
                                        Сумма: <span className="font-semibold">{amount.toFixed(2)} ₽</span>
                                        {insufficient && <span className="ml-2">(доступно {available.toFixed(2)} ₽)</span>}
                                      </div>
                                    );
                                  })()}
                                </div>
                                <div className="w-full flex items-center gap-2">
                                  <div className="text-xs text-gray-600">Годен до:</div>
                                  <Input type="datetime-local" className="w-56" onChange={(e) => { (window as any).__expiresAt = e.target.value ? new Date(e.target.value).getTime() : undefined; }} />
                                </div>
                                <Button
                                  size="sm"
                                  onClick={async () => {
                                    setAdjustError("");
                                    const res = await adjustDirect({ productId: p._id as any, quantity: adjustQty || 0, type: "plus", comment: adjustComment || undefined, bank: adjustBank, expiresAt: (window as any).__expiresAt } as any);
                                    if (res?.ok) {
                                      setActiveAdjust(null);
                                      setAdjustQty(0);
                                      setAdjustComment("");
                                    } else if (res?.error) {
                                      setAdjustError(res.error);
                                    }
                                  }}
                                >
                                  Провести
                                </Button>
                                {adjustError && (
                                  <div className="w-full text-sm text-red-600 font-medium">{adjustError}</div>
                                )}
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>

                        <Popover
                          open={activeAdjust?.productId === p._id && activeAdjust?.type === "minus"}
                          onOpenChange={(o) => setActiveAdjust(o ? { productId: p._id, type: "minus" } : null)}
                        >
                          <PopoverTrigger asChild>
                            <Button size="sm" variant="destructive">-</Button>
                          </PopoverTrigger>
                          <PopoverContent align="end" className="w-[420px]">
                            <div className="space-y-2">
                              <div className="text-sm font-medium">Расход</div>
                              <div className="flex flex-wrap gap-2">
                                <Input
                                  type="number"
                                  placeholder="Кол-во"
                                  value={adjustQty || ""}
                                  onChange={(e) => setAdjustQty(parseFloat(e.target.value) || 0)}
                                  className="w-28"
                                />
                                <Input
                                  placeholder="Комментарий"
                                  value={adjustComment}
                                  onChange={(e) => setAdjustComment(e.target.value)}
                                  className="min-w-60"
                                />
                                <Button
                                  size="sm"
                                  onClick={async () => {
                                    await handleAdjust(p._id, "minus", adjustQty, adjustComment || undefined);
                                    setActiveAdjust(null);
                                  }}
                                >
                                  Провести
                                </Button>
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                        <DropdownMenu>
                          <DropdownMenuTrigger className="border border-black rounded-lg text-black"><MoreHorizontal className="w-10 h-4" /></DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem><Link href={`/warehouse/${p._id}/edit`}>Редактировать</Link></DropdownMenuItem>
                            <DropdownMenuItem className="text-red-500" onClick={() => handleDelete(p._id)}>Удалить</DropdownMenuItem>
                            <DropdownMenuItem><Link href={`/warehouse/${p._id}`}>Движения</Link></DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      {/* inline form removed in favor of Popover */}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <Pagination className="pt-3">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious title="←" href="#" onClick={(e) => { e.preventDefault(); setPage((p) => Math.max(1, p - 1)); }} className={page <= 1 ? "pointer-events-none opacity-50" : ""} />
              </PaginationItem>
              <PaginationItem>
                <PaginationLink href="#" isActive>
                  {page}
                </PaginationLink>
              </PaginationItem>
              <PaginationItem>
                <PaginationNext title="→" href="#" onClick={(e) => { e.preventDefault(); setPage((p) => Math.min(totalPages, p + 1)); }} className={page >= totalPages ? "pointer-events-none opacity-50" : ""} />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </CardContent>
      </Card>
    </div>
  );
}


