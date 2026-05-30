"use client";
import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import {Wallet, Bitcoin, ListChecks} from "lucide-react";
function useToday() {
  return useMemo(() => {
    const now = new Date();
    const from = new Date(now); from.setHours(0,0,0,0);
    const to = new Date(now); to.setHours(23,59,59,999);
    return { from: +from, to: +to };
  }, []);
}

function formatLocal(dtMs: number) {
  const d = new Date(dtMs);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`; // local time for input[type=datetime-local]
}

export default function TransactionsPage() {
  const today = useToday();
  const [fromDate, setFromDate] = useState<Date>(new Date(today.from));
  const [toDate, setToDate] = useState<Date>(new Date(today.to));
  const [fromTime, setFromTime] = useState<string>("00:00");
  const [toTime, setToTime] = useState<string>("23:59");
  const banks = useQuery(api.transactions.listBanks) || [];
  const stats = useQuery(api.transactions.stats);
  function withTime(base: Date, time: string): number {
    const [hh = "0", mm = "0"] = (time || "0:0").split(":");
    const d = new Date(base);
    d.setHours(parseInt(hh || "0"), parseInt(mm || "0"), 0, 0);
    return +d;
  }
  const fromMs = useMemo(() => withTime(fromDate, fromTime), [fromDate, fromTime]);
  const toMs = useMemo(() => withTime(toDate, toTime), [toDate, toTime]);
  const list = useQuery(api.transactions.list, { from: fromMs, to: toMs }) || [];
  const create = useMutation(api.transactions.create);
  const [form, setForm] = useState<any>({ bank: "cash", type: "plus", reason: "direct", amount: 0, comment: "" });
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-6 max-w-7xl mt-5 mx-auto">
      <h1 className="text-2xl font-bold">Финансы</h1>
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="bg-green-500 text-white"><CardTitle className="text-xl"><div className="flex items-center gap-4"> Наличные<Wallet className="size-7" /></div></CardTitle></CardHeader>
          <CardContent className="text-3xl text-right font-black">{stats?.cash ?? 0} ₽</CardContent>
        </Card>
        <Card>
          <CardHeader className="bg-blue-500 text-white"><CardTitle className="text-xl"><div className="flex items-center gap-4"> Безнал<Bitcoin className="size-7" /></div></CardTitle></CardHeader>
          <CardContent className="text-3xl text-right font-black">{stats?.card ?? 0} ₽</CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>Создать транзакцию</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Создать транзакцию</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-5 gap-3">
              <Select value={form.bank} onValueChange={(v) => setForm((s: any) => ({ ...s, bank: v }))}>
                <SelectTrigger><SelectValue placeholder="Банк" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Наличные</SelectItem>
                  <SelectItem value="card">Безнал</SelectItem>
                </SelectContent>
              </Select>
              <Select value={form.type} onValueChange={(v) => setForm((s: any) => ({ ...s, type: v }))}>
                <SelectTrigger><SelectValue placeholder="Тип" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="plus">Приход</SelectItem>
                  <SelectItem value="minus">Расход</SelectItem>
                </SelectContent>
              </Select>
              <Select value={form.reason} onValueChange={(v) => setForm((s: any) => ({ ...s, reason: v }))}>
                <SelectTrigger><SelectValue placeholder="Основание" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="direct">Ручная</SelectItem>
                  <SelectItem value="sale">Продажа</SelectItem>
                  <SelectItem value="productBuy">Закупка</SelectItem>
                </SelectContent>
              </Select>
              <Input type="number" placeholder="Сумма" value={form.amount} onChange={(e) => setForm((s: any) => ({ ...s, amount: Number(e.target.value || 0) }))} />
              <Input placeholder="Комментарий" value={form.comment} onChange={(e) => setForm((s: any) => ({ ...s, comment: e.target.value }))} />
            </div>
            <DialogFooter>
              <Button onClick={async () => {
                await create({ bank: form.bank, type: form.type, reason: form.reason, amount: form.amount, comment: form.comment } as any);
                setOpen(false);
              }}>Создать</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="bg-zinc-800 text-white"><CardTitle className="text-xl"><div className="flex items-center gap-4"> Транзакции<ListChecks className="size-7" /></div></CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-48 justify-between font-normal">
                    <span>{fromDate.toLocaleDateString()}</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-2" align="start">
                  <Calendar mode="single" selected={fromDate} onSelect={(d) => d && setFromDate(d)} captionLayout="dropdown" />
                </PopoverContent>
              </Popover>
              <Input type="time" step={60} value={fromTime} onChange={(e) => setFromTime(e.target.value)} className="w-32" />
            </div>
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-48 justify-between font-normal">
                    <span>{toDate.toLocaleDateString()}</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-2" align="start">
                  <Calendar mode="single" selected={toDate} onSelect={(d) => d && setToDate(d)} captionLayout="dropdown" />
                </PopoverContent>
              </Popover>
              <Input type="time" step={60} value={toTime} onChange={(e) => setToTime(e.target.value)} className="w-32" />
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Дата</TableHead>
                <TableHead>Банк</TableHead>
                
                <TableHead>Основание</TableHead>
                <TableHead className="text-right">Сумма</TableHead>
                <TableHead className="text-right">Остаток</TableHead>
                <TableHead>Комментарий</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((t: any) => {
                const isPlus = t.type === 'plus';
                const rowBg = isPlus ? 'bg-green-50' : 'bg-red-50';
                const amountCls = isPlus ? 'text-green-700 font-bold' : 'text-red-700 font-bold';
                const estCls = 'text-foreground font-bold';
                const bankRu = t.bankName === 'cash' ? 'Наличные' : 'Безнал';
                const typeRu = isPlus ? 'Приход' : 'Расход';
                const reasonRu = t.reason === 'sale' ? 'Продажа' : t.reason === 'productBuy' ? 'Закупка' : 'Ручная';
                return (
                  <TableRow key={t._id} className={rowBg}>
                    <TableCell className="whitespace-nowrap">{new Date(t.date).toLocaleString()}</TableCell>
                    <TableCell>{bankRu}</TableCell>
                    
                    <TableCell>{reasonRu}</TableCell>
                    <TableCell className={"text-right " + amountCls}>{isPlus ? '+' : '-'}{t.amount} ₽</TableCell>
                    <TableCell className={"text-right " + estCls}>{t.estimate} ₽</TableCell>
                    <TableCell className="max-w-[360px] truncate" title={t.comment || ''}>{t.comment || ''}</TableCell>
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


