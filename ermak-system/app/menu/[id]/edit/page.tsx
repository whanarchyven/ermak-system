"use client";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormInput } from "@/components/ui/form-input";
import { FormSelect } from "@/components/ui/form-select";
import { FormTextarea } from "@/components/ui/form-textarea";
import { FormFileUpload } from "@/components/ui/form-file-upload";
import { useMenu } from "../../../../features/menu-management";
import { Id } from "../../../../convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useProducts } from "../../../../features/warehouse";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";

export default function EditMenuItemPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const { categories, menuPositions, setForm, form, handleFileUpload, isUploading } = useMenu();
  const updateMenuPosition = useMutation(api.restaurant.updateMenuPosition);
  const { products } = useProducts();
  const [search, setSearch] = useState("");

  useEffect(() => {
    const p = (menuPositions || []).find((m) => m._id === id);
    if (p) {
      setForm({
        name: p.name,
        categoryId: p.categoryId as Id<"categories">,
        articleNumber: p.articleNumber,
        price: p.price,
        photo: p.photo || "",
        gallery: (p as any).gallery || [],
        description: (p as any).description || "",
        weight: p.weight,
        structure: p.structure,
        discountPrice: p.discountPrice ?? null,
        cashback_score: (p as any).cashback_score ?? null,
        ingredients: (p as any).ingredients || [],
      });
    }
  }, [menuPositions, id, setForm]);

  const categoryOptions = (categories || []).map((c) => ({ value: c._id, label: c.name }));

  const onSave = async () => {
    // Валидация обязательных полей без редиректа
    if (!form.name.trim() || !form.categoryId || form.articleNumber <= 0 || form.price <= 0 || form.weight <= 0 || !form.structure.trim()) {
      alert("Пожалуйста, заполните все обязательные поля");
      return;
    }
    await updateMenuPosition({
      menuPositionId: id as Id<"menuPositions">,
      name: form.name.trim(),
      categoryId: form.categoryId as Id<"categories">,
      articleNumber: form.articleNumber,
      price: form.price,
      photo: form.photo || undefined,
      weight: form.weight,
      structure: form.structure.trim(),
      discountPrice: form.discountPrice ?? undefined,
      cashback_score: form.cashback_score ?? undefined,
      ingredients: (form.ingredients || []) as any,
    });
    router.push("/menu");
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Редактировать блюдо</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput label="Наименование" value={form.name} onChange={(v) => setForm((prev) => ({ ...prev, name: v }))} required />
            <FormSelect label="Категория" value={form.categoryId} onChange={(v) => setForm((prev) => ({ ...prev, categoryId: v as any }))} options={categoryOptions} required />
            <FormInput label="Артикул" value={form.articleNumber.toString()} onChange={(v) => setForm((prev) => ({ ...prev, articleNumber: parseInt(v) || 0 }))} type="number" required />
            <FormInput label="Цена (₽)" value={form.price.toString()} onChange={(v) => setForm((prev) => ({ ...prev, price: parseFloat(v) || 0 }))} type="number" step="0.01" required />
            <FormInput label="Граммовка (г)" value={form.weight.toString()} onChange={(v) => setForm((prev) => ({ ...prev, weight: parseInt(v) || 0 }))} type="number" required />
            <FormInput label="Скидка (₽)" value={form.discountPrice?.toString() || ""} onChange={(v) => setForm((prev) => ({ ...prev, discountPrice: v ? parseFloat(v) : null }))} type="number" step="0.01" />
            <FormInput label="Баллы кэшбэка за единицу" value={form.cashback_score?.toString() || ""} onChange={(v) => setForm((prev) => ({ ...prev, cashback_score: v ? parseInt(v) : null }))} type="number" />
            <div className="md:col-span-2">
              <FormTextarea label="Состав" value={form.structure} onChange={(v) => setForm((prev) => ({ ...prev, structure: v }))} required />
            </div>
            <div className="md:col-span-2">
              <FormFileUpload label="Фото" onFileSelect={handleFileUpload} isUploading={isUploading} previewUrl={form.photo} onRemove={() => setForm((prev) => ({ ...prev, photo: "" }))} />
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <Button onClick={onSave} disabled={isUploading}>{isUploading ? "Сохранение..." : "Сохранить"}</Button>
            <Button variant="outline" onClick={() => router.push("/menu")}>Отмена</Button>
          </div>
          {/* Ингредиенты */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-1 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Складские продукты</CardTitle>
              </CardHeader>
              <CardContent>
                <Input placeholder="Поиск продуктов" value={search} onChange={(e) => setSearch(e.target.value)} className="mb-2" />
                <div className="max-h-64 overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Продукт</TableHead>
                        <TableHead className="text-right">Добавить</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(products || []).filter(p => p.name.toLowerCase().includes(search.toLowerCase())).map((p) => (
                        <TableRow key={p._id}>
                          <TableCell className="font-medium">{p.name} <span className="text-xs text-gray-500">({p.unit})</span></TableCell>
                          <TableCell className="text-right">
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button size="sm" variant="outline">Добавить</Button>
                              </PopoverTrigger>
                              <PopoverContent align="end" className="w-64">
                                <div className="space-y-2">
                                  <div className="text-sm">Количество ({p.unit})</div>
                                  <Input type="number" min={0} step="0.01" placeholder="0" onChange={(e) => {
                                    (window as any).__tmpQty = parseFloat(e.target.value) || 0;
                                  }} />
                                  <Button size="sm" onClick={() => {
                                    const qty = (window as any).__tmpQty || 0;
                                    if (qty <= 0) return;
                                    const exists = (form.ingredients || []).some((it: any) => it.productId === p._id);
                                    const next = exists
                                      ? (form.ingredients || []).map((it: any) => it.productId === p._id ? { ...it, quantity: qty } : it)
                                      : [ ...(form.ingredients || []), { productId: p._id as any, quantity: qty } ];
                                    setForm(prev => ({ ...prev, ingredients: next as any }));
                                  }}>Добавить</Button>
                                </div>
                              </PopoverContent>
                            </Popover>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Рецепт блюда</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-64 overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Продукт</TableHead>
                        <TableHead>Кол-во</TableHead>
                        <TableHead className="text-right">Действия</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(form.ingredients || []).map((ing: any, idx: number) => {
                        const prod = (products || []).find(p => p._id === ing.productId);
                        return (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">{prod?.name} <span className="text-xs text-gray-500">({prod?.unit})</span></TableCell>
                            <TableCell>
                              <Input type="number" min={0} step="0.01" value={String(ing.quantity)} onChange={(e) => {
                                const qty = parseFloat(e.target.value) || 0;
                                const next = (form.ingredients || []).map((it: any, i: number) => i === idx ? { ...it, quantity: qty } : it);
                                setForm(prev => ({ ...prev, ingredients: next as any }));
                              }} />
                            </TableCell>
                            <TableCell className="text-right">
                              <Button size="sm" variant="destructive" onClick={() => {
                                const next = (form.ingredients || []).filter((_: any, i: number) => i !== idx);
                                setForm(prev => ({ ...prev, ingredients: next as any }));
                              }}>Удалить</Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


