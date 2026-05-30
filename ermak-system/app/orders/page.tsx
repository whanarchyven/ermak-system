"use client";
import { useMemo, useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ListChecks } from "lucide-react";

export default function OrdersSearchPage() {
  const [orderId, setOrderId] = useState("");
  const router = useRouter();
  const [page, setPage] = useState(1);
  const pageSize = 20;
  // Все заказы за 30 дней с пагинацией
  const [fromDate, setFromDate] = useState<Date>(() => { const d=new Date(); d.setDate(d.getDate()-7); d.setHours(0,0,0,0); return d; });
  const [toDate, setToDate] = useState<Date>(() => { const d=new Date(); d.setHours(23,59,59,999); return d; });
  const from = +fromDate;
  const to = +toDate;
  const list = useQuery(api.orders.listByDate, { from, to }) as any;
  const allRows = useMemo(() => {
    const arr = (list ? [
      ...(list.backlog||[]), ...(list.pending||[]), ...(list.ready||[]),
      ...(list.delivery||[]), ...(list.delivery_pending||[]), ...(list.completed||[])
    ] : []) as any[];
    return arr.sort((a:any,b:any)=>b.createdAt-a.createdAt);
  }, [list]);
  const totalPages = Math.max(1, Math.ceil(allRows.length / pageSize));
  const rows = allRows.slice((page-1)*pageSize, (page-1)*pageSize + pageSize);

  const go = () => {
    const id = orderId.trim();
    if (!id) return;
    router.push(`/orders/${encodeURIComponent(id)}`);
  };

  return (
    <div className="max-w-6xl mt-10 mx-auto">
      <Card>
        <CardHeader className="bg-zinc-800 text-white">
          <CardTitle className="text-xl"><div className="flex items-center gap-4"> Все заказы <ListChecks className="size-7" /></div></CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Input
              placeholder="Введите ID заказа"
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") go(); }}
            />
            <Button onClick={go} disabled={!orderId.trim()}>Поиск</Button>
          </div>
          <div className="mt-6 space-y-3">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-48 justify-between font-normal">
                      <span>{fromDate.toLocaleDateString()}</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-2" align="start">
                    <Calendar mode="single" selected={fromDate} onSelect={(d)=> d && setFromDate(d)} captionLayout="dropdown" />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="flex items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-48 justify-between font-normal">
                      <span>{toDate.toLocaleDateString()}</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-2" align="start">
                    <Calendar mode="single" selected={toDate} onSelect={(d)=> d && setToDate(d)} captionLayout="dropdown" />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Дата</TableHead>
                  <TableHead>Клиент</TableHead>
                  <TableHead>Сумма</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((o:any)=> (
                  <TableRow key={o._id}>
                    <TableCell className="max-w-[240px] whitespace-nowrap overflow-hidden text-ellipsis">{String(o._id)}</TableCell>
                    <TableCell>{new Date(o.createdAt).toLocaleString()}</TableCell>
                    <TableCell>{o.client?.name || o.clientInfo?.name || "—"}</TableCell>
                    <TableCell>{o.total} ₽</TableCell>
                    <TableCell>{o.status}</TableCell>
                    <TableCell><Button size="sm" onClick={()=> router.push(`/orders/${o._id}`)}>Подробнее</Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {allRows.length > pageSize && (
              <div className="flex items-center justify-center gap-3 mt-4">
                <Button variant="outline" disabled={page<=1} onClick={()=> setPage(p=>Math.max(1,p-1))}>Назад</Button>
                <div className="text-sm">{page} / {totalPages}</div>
                <Button variant="outline" disabled={page>=totalPages} onClick={()=> setPage(p=>Math.min(totalPages,p+1))}>Вперёд</Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


