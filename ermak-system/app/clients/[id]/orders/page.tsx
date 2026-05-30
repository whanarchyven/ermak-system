"use client";
import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function ClientOrdersPage() {
  const params = useParams<{ id: string }>();
  const clientId = params?.id as any;
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const items = (useQuery(api.orders.listByClient, clientId ? { clientId } : "skip" as any) as any[]) || [];
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const pageItems = items.slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize);

  return (
    <div className="space-y-6 max-w-5xl mt-5 mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">История заказов</h1>
        <Button asChild variant="outline"><Link href="/clients">← К клиентам</Link></Button>
      </div>
      <div className="grid gap-3">
        {pageItems.map((o) => (
          <Card key={o._id}>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                <span>Заказ {String(o._id)}</span>
                <span className="text-sm text-gray-600">{new Date(o.createdAt).toLocaleString()}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm">Тип: {o.type}</div>
                  <div className="text-sm">Сумма: {o.total} ₽</div>
                  <div className="text-sm">Статус: {o.status}</div>
                </div>
                <Button asChild><Link href={`/orders/${o._id}`}>Открыть</Link></Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {items.length > pageSize && (
          <div className="flex items-center justify-center gap-2">
            <Button variant="outline" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Назад</Button>
            <div className="text-sm">{page} / {totalPages}</div>
            <Button variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Вперёд</Button>
          </div>
        )}
      </div>
    </div>
  );
}


