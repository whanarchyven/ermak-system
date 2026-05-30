"use client";
import { useMemo, useState } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import Link from "next/link";

export default function ClientsPage() {
  const clients = useQuery(api.clients.list) || [];
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [openAll, setOpenAll] = useState(false);
  const [openSome, setOpenSome] = useState(false);
  const [openOne, setOpenOne] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const notify = useAction(api.orders.notifyClient);

  const filtered = useMemo(() => {
    if (!search.trim()) return clients;
    const s = search.toLowerCase();
    return clients.filter((c: any) =>
      (c.name || "").toLowerCase().includes(s) ||
      (c.phone || "").toLowerCase().includes(s) ||
      (c.username || "").toLowerCase().includes(s)
    );
  }, [clients, search]);

  const [title, setTitle] = useState("");

  async function sendTo(list: any[]) {
    if (!message.trim()) {
      toast.error("Введите текст уведомления");
      return;
    }
    const total = list.length;
    let done = 0;
    let failed = 0;
    setProgress({ done, total });
    for (const c of list) {
      const client = c;
      try {
        await notify({ clientId: client._id, message, title: title.trim() || undefined });
      } catch {
        failed += 1;
      }
      done += 1;
      setProgress({ done, total });
    }
    setMessage("");
    setTitle("");
    if (failed > 0) toast.warning(`Отправлено ${total - failed} из ${total} (ошибок: ${failed})`);
    else toast.success(`Уведомление отправлено: ${total}`);
  }

  const selectedList = clients.filter((c: any) => selected[String(c._id)]);

  return (
    <div className="space-y-6 max-w-7xl mt-5 mx-auto">
      <Card>
        <CardHeader className="bg-zinc-800 text-white">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">Клиенты / Рассылки</CardTitle>
            <div className="flex items-center gap-2">
              <Input placeholder="Поиск" value={search} onChange={(e) => setSearch(e.target.value)} className="w-64 bg-white text-black" />
              <Dialog open={openAll} onOpenChange={setOpenAll}>
                <DialogTrigger asChild>
                  <Button onClick={() => setOpenAll(true)}>Отправить всем</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-xl">
                  <DialogHeader><DialogTitle>Сообщение всем ({clients.length})</DialogTitle></DialogHeader>
                  <input className="w-full border rounded p-2" placeholder="Заголовок (необязательно)" value={title} onChange={(e) => setTitle(e.target.value)} />
                  <textarea className="w-full min-h-40 border rounded p-2 mt-2" placeholder="Текст уведомления (in-app + web push)" value={message} onChange={(e) => setMessage(e.target.value)} />
                  <div className="flex items-center justify-between">
                    <Button onClick={async () => { await sendTo(clients); }}>Отправить</Button>
                    {progress && <div className="text-sm text-gray-700">Отправлено {progress.done} / {progress.total}</div>}
                  </div>
                </DialogContent>
              </Dialog>
              <Dialog open={openSome} onOpenChange={setOpenSome}>
                <DialogTrigger asChild>
                  <Button onClick={() => setOpenSome(true)}>Отправить нескольким ({selectedList.length})</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-xl">
                  <DialogHeader><DialogTitle>Сообщение выбранным ({selectedList.length})</DialogTitle></DialogHeader>
                  <input className="w-full border rounded p-2" placeholder="Заголовок (необязательно)" value={title} onChange={(e) => setTitle(e.target.value)} />
                  <textarea className="w-full min-h-40 border rounded p-2 mt-2" placeholder="Текст уведомления (in-app + web push)" value={message} onChange={(e) => setMessage(e.target.value)} />
                  <div className="flex items-center justify-between">
                    <Button onClick={async () => { await sendTo(selectedList); setSelected({}); }}>Отправить</Button>
                    {progress && <div className="text-sm text-gray-700">Отправлено {progress.done} / {progress.total}</div>}
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
                <TableHead></TableHead>
                <TableHead>Имя</TableHead>
                <TableHead>Телефон</TableHead>
                <TableHead>Telegram</TableHead>
                <TableHead>Имена</TableHead>
                <TableHead>Адреса</TableHead>
                <TableHead>Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c: any) => {
                const firstName = (c.name_pool && c.name_pool.length ? c.name_pool[0] : c.name) || "—";
                const phones = [c.phone, ...(c.phone_pool || [])].filter(Boolean).join(", ");
                const addrs = (c.address_pool || []).map((a: any) => a.address).join("; ");
                const hasTg = !!c.chatId || !!c.tgId || !!c.username;
                return (
                  <TableRow key={c._id}>
                    <TableCell>
                      <input type="checkbox" checked={!!selected[String(c._id)]} onChange={(e) => setSelected((s) => ({ ...s, [String(c._id)]: e.target.checked }))} />
                    </TableCell>
                    <TableCell className="font-medium">{firstName}</TableCell>
                    <TableCell>{phones || "—"}</TableCell>
                    <TableCell>{hasTg ? (c.username || c.tgId || c.chatId) : "—"}</TableCell>
                    <TableCell className="max-w-[260px] whitespace-normal break-words text-sm">{(c.name_pool || []).join(", ")}</TableCell>
                    <TableCell className="max-w-[360px] whitespace-normal break-words text-sm">{addrs || "—"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/clients/${c._id}/orders`}>История заказов</Link>
                        </Button>
                        {(
                          <Dialog open={openOne === String(c._id)} onOpenChange={(o) => setOpenOne(o ? String(c._id) : null)}>
                            <DialogTrigger asChild>
                              <Button size="sm">Уведомление</Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-xl">
                              <DialogHeader><DialogTitle>Уведомление для {firstName}</DialogTitle></DialogHeader>
                              <input className="w-full border rounded p-2" placeholder="Заголовок (необязательно)" value={title} onChange={(e) => setTitle(e.target.value)} />
                  <textarea className="w-full min-h-40 border rounded p-2 mt-2" placeholder="Текст уведомления (in-app + web push)" value={message} onChange={(e) => setMessage(e.target.value)} />
                              <div className="flex items-center justify-between">
                                <Button onClick={async () => { await sendTo([c]); setOpenOne(null); }}>Отправить</Button>
                                {progress && <div className="text-sm text-gray-700">Отправлено {progress.done} / {progress.total}</div>}
                              </div>
                            </DialogContent>
                          </Dialog>
                        )}
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


