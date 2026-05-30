"use client";
import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import Link from "next/link";

export default function WorkshopsPage() {
  const workshops = useQuery(api.workshops.list) || [];
  const create = useMutation(api.workshops.create);
  const update = useMutation(api.workshops.update);
  const remove = useMutation(api.workshops.remove);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");

  return (
    <div className="space-y-6 max-w-5xl mt-5 mx-auto">
      <Card>
        <CardHeader className="bg-zinc-800 text-white">
          <CardTitle className="text-xl">Цеха</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-end gap-2 flex-wrap">
            <div className="flex flex-col gap-1">
              <label className="text-sm text-gray-600">Название</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Например: Горячий цех" className="w-64" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm text-gray-600">Слаг (необязательно)</label>
              <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="hot" className="w-48" />
            </div>
            <Button
              onClick={async () => { if (!name.trim()) return; await create({ name, slug: slug.trim() || undefined }); setName(""); setSlug(""); toast.success("Цех добавлен"); }}
            >Добавить цех</Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Название</TableHead>
                <TableHead>Слаг</TableHead>
                <TableHead>Ссылка на доску</TableHead>
                <TableHead>Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(workshops as any[]).map((w) => (
                <WorkshopRow key={w._id} w={w} onUpdate={update} onRemove={remove} />
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function WorkshopRow({ w, onUpdate, onRemove }: { w: any; onUpdate: any; onRemove: any }) {
  const [name, setName] = useState(w.name);
  const [editing, setEditing] = useState(false);
  return (
    <TableRow>
      <TableCell>
        {editing ? (
          <Input value={name} onChange={(e) => setName(e.target.value)} className="w-56" />
        ) : (
          <span className="font-medium">{w.name}</span>
        )}
      </TableCell>
      <TableCell className="font-mono text-sm">{w.slug}</TableCell>
      <TableCell>
        <Link className="text-blue-600 underline" href={`/kitchen/${w.slug}`}>/kitchen/{w.slug}</Link>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          {editing ? (
            <>
              <Button size="sm" onClick={async () => { await onUpdate({ id: w._id, name }); setEditing(false); toast.success("Цех обновлён"); }}>Сохранить</Button>
              <Button size="sm" variant="outline" onClick={() => { setName(w.name); setEditing(false); }}>Отмена</Button>
            </>
          ) : (
            <Button size="sm" variant="outline" onClick={() => setEditing(true)}>Изменить</Button>
          )}
          <Button size="sm" variant="destructive" onClick={async () => { if (confirm(`Удалить цех «${w.name}»?`)) { await onRemove({ id: w._id }); toast.success("Цех удалён"); } }}>Удалить</Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
