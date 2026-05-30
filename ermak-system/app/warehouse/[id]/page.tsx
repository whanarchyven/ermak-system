"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Calendar as CalendarIcon, ChevronDown } from "lucide-react";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function ProductTransactionsPage() {
  const params = useParams();
  const id = params?.id as any;
  const product = useQuery(api.warehouse.getProduct, id ? { productId: id } : "skip");
  const transactions = useQuery(api.warehouse.listTransactionsByProduct, id ? { productId: id } : "skip");
  const batches = useQuery(api.warehouse.listBatchesByProduct, id ? { productId: id } : "skip");
  const adjust = useMutation(api.warehouse.adjustEstimate);

  const [fromDate, setFromDate] = useState<Date | undefined>(undefined);
  const [toDate, setToDate] = useState<Date | undefined>(undefined);

  const filteredTx = useMemo(() => {
    let list = transactions || [];
    if (fromDate) {
      const start = new Date(fromDate);
      start.setHours(0, 0, 0, 0);
      list = list.filter((t: any) => t.date >= +start);
    }
    if (toDate) {
      const end = new Date(toDate);
      end.setHours(23, 59, 59, 999);
      list = list.filter((t: any) => t.date <= +end);
    }
    return list;
  }, [transactions, fromDate, toDate]);

  // Пагинация по транзакциям
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil((filteredTx?.length || 0) / pageSize));
  const pageTx = useMemo(() => {
    const start = (page - 1) * pageSize;
    return (filteredTx || []).slice(start, start + pageSize);
  }, [filteredTx, page]);

  // Форма операции по складу
  const [opType, setOpType] = useState<"plus" | "minus">("plus");
  const [qty, setQty] = useState<string>("");
  const [comment, setComment] = useState<string>("");
  const [bank, setBank] = useState<"cash" | "card">("card");
  const [errorText, setErrorText] = useState<string>("");
  const [expDate, setExpDate] = useState<string>("");
  const expMs = useMemo(() => (expDate ? new Date(expDate).getTime() : undefined), [expDate]);

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Движения продукта</h1>
        <Link href="/warehouse" className="text-sm text-blue-600">← Назад</Link>
      </div>

      {product && (
        <Card>
          <CardHeader>
            <CardTitle>{product.name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm text-black">
           <div className="grid grid-cols-3 gap-4">
            <div className="flex  flex-col gap-2">
              <div className="text-sm text-black">Остаток:</div>
              <div className={cn("text-xl font-bold", product.estimate < product.safeEstimate ? "text-red-500" : "text-black")}>{product.estimate} {product.unit}</div>
            </div>
            <div className="flex flex-col gap-2">
              <div className="text-sm text-black">Безопасный остаток:</div>
              <div className="text-xl font-bold">{product.safeEstimate} {product.unit}</div>
            </div>
            <div className="flex flex-col gap-2">
              <div className="text-sm text-black">Цена:</div>
              <div className="text-xl font-bold">{product.priceForBase} ₽</div>
            </div>
            
           </div>
          </CardContent>
        </Card>
      )}

      {/* Операции со складом */}
      {product && (
        <Card>
          <CardHeader>
            <CardTitle>Операции со складом</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-6 gap-3 items-end">
            <div className="col-span-2">
              <div className="text-xs text-gray-600 mb-1">Тип операции</div>
              <Select value={opType} onValueChange={(v) => setOpType(v as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="Тип" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="plus">Приход (пополнение)</SelectItem>
                  <SelectItem value="minus">Расход (списание)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <div className="text-xs text-gray-600 mb-1">Количество ({product.unit})</div>
              <Input type="number" min={0} value={qty} onChange={(e) => setQty(e.target.value)} placeholder="0" />
            </div>
            <div className="col-span-2">
              <div className="text-xs text-gray-600 mb-1">Комментарий</div>
              <Input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Например: поставка от 01.11" />
            </div>

            {opType === "plus" && (
              <div className="col-span-2">
                <div className="text-xs text-gray-600 mb-1">Банк (списать оплату)</div>
                <Select value={bank} onValueChange={(v) => setBank(v as any)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Банк" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Наличные</SelectItem>
                    <SelectItem value="card">Безнал</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {opType === "plus" && (
              <div className="col-span-2">
                <div className="text-xs text-gray-600 mb-1">Годен до</div>
                <Input type="datetime-local" value={expDate} onChange={(e) => setExpDate(e.target.value)} />
              </div>
            )}

            <div className="col-span-6 flex items-center gap-3">
              <Button onClick={async () => {
                setErrorText("");
                const q = Number(qty);
                if (!q || q <= 0) { setErrorText("Введите положительное количество"); return; }
                const res = await adjust({ productId: id as any, quantity: q, type: opType, comment: comment || undefined, bank: opType === 'plus' ? bank : undefined, expiresAt: opType === 'plus' ? (expMs as any) : undefined } as any);
                if (res?.ok) {
                  setQty(""); setComment(""); if (opType === 'plus') setExpDate("");
                } else if (res?.error) {
                  setErrorText(res.error);
                }
              }}>Применить</Button>
              {errorText && <div className="text-sm text-red-600 font-medium">{errorText}</div>}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Транзакции</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="text-sm text-gray-700">Период:</div>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-48 justify-between font-normal">
                  <span className="flex items-center gap-2">
                    <CalendarIcon className="size-4" />
                    {fromDate ? fromDate.toLocaleDateString() : "С даты"}
                  </span>
                  <ChevronDown className="size-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto overflow-hidden p-0" align="start">
                <Calendar
                  mode="single"
                  selected={fromDate}
                  captionLayout="dropdown"
                  onSelect={(d: Date | undefined) => setFromDate(d)}
                />
              </PopoverContent>
            </Popover>
            <span className="text-gray-500">—</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-48 justify-between font-normal">
                  <span className="flex items-center gap-2">
                    <CalendarIcon className="size-4" />
                    {toDate ? toDate.toLocaleDateString() : "По дату"}
                  </span>
                  <ChevronDown className="size-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto overflow-hidden p-0" align="start">
                <Calendar
                  mode="single"
                  selected={toDate}
                  captionLayout="dropdown"
                  onSelect={(d: Date | undefined) => setToDate(d)}
                />
              </PopoverContent>
            </Popover>
          </div>

          {(filteredTx || []).length === 0 && (
            <div className="text-sm text-gray-500">Пока нет транзакций</div>
          )}
          {(pageTx || []).map((t: any) => {
            const color = t.type === "plus" ? "text-emerald-600" : "text-red-600";
            const sign = t.type === "plus" ? "+" : "-";
            return (
              <div key={t._id} className="flex items-center justify-between border p-2 rounded-md">
                <div className="text-sm">
                  <div className="font-medium">{new Date(t.date).toLocaleString()}</div>
                  <div className={`font-medium ${color}`}>{sign} {t.quantity}</div>
                  {t.comment && <div className="text-gray-500">{t.comment}</div>}
                </div>
                <div className="text-sm text-gray-700">Остаток: {t.estimate}</div>
              </div>
            );
          })}

          {(filteredTx || []).length > pageSize && (
            <Pagination className="pt-3">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious href="#" onClick={(e) => { e.preventDefault(); setPage((p) => Math.max(1, p - 1)); }} className={page <= 1 ? "pointer-events-none opacity-50" : ""} />
                </PaginationItem>
                <PaginationItem>
                  <PaginationLink href="#" isActive>
                    {page}
                  </PaginationLink>
                </PaginationItem>
                <PaginationItem>
                  <PaginationNext href="#" onClick={(e) => { e.preventDefault(); setPage((p) => Math.min(totalPages, p + 1)); }} className={page >= totalPages ? "pointer-events-none opacity-50" : ""} />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Партии (стек)</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Годен до</TableHead>
                <TableHead>Кол-во</TableHead>
                <TableHead>Остаток</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(batches || []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-sm text-gray-500">Нет партий</TableCell>
                </TableRow>
              )}
              {[...(batches || [])].sort((a: any, b: any) => (b.expiresAt || 0) - (a.expiresAt || 0)).map((b: any) => (
                <TableRow key={b._id}>
                  <TableCell>{new Date(b.expiresAt).toLocaleString()}</TableCell>
                  <TableCell className="font-semibold">{b.quantity}</TableCell>
                  <TableCell className="font-semibold">{(b.estimate ?? b.quantity)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}


