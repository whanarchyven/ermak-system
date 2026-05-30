"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormInput } from "@/components/ui/form-input";
import { FormSelect } from "@/components/ui/form-select";
import { FormTextarea } from "@/components/ui/form-textarea";
import { FormFileUpload } from "@/components/ui/form-file-upload";
import { ArrowLeft, Plus, Utensils } from "lucide-react";
import { useProducts } from "../../../features/warehouse";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Layout } from "../../../widgets/layout";
import { useMenu } from "../../../features/menu-management";
import { FormMultiFileUpload } from "@/components/ui/form-file-upload-multi";

export default function CreateMenuPositionPage() {
  const searchParams = useSearchParams();
  const defaultCategoryId = searchParams ? searchParams.get("category") : null;

  const {
    categories,
    form,
    isUploading,
    handleFileUpload,
    handleCreatePosition,
    handleFilesUpload,
    setForm,
  } = useMenu();


  const { products } = useProducts();
  const [search, setSearch] = useState("");
  const filteredProducts = (products || []).filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.categoryId || form.articleNumber <= 0 || form.price <= 0 || form.weight <= 0 || !form.structure.trim()) {
      alert("Пожалуйста, заполните все обязательные поля");
      return;
    }

    try {
      await handleCreatePosition();
      // Перенаправляем на страницу меню с фильтром по категории
      const categoryParam = form.categoryId ? `?category=${form.categoryId}` : "";
      window.location.href = `/menu${categoryParam}`;
    } catch (error) {
      alert("Ошибка при создании блюда");
    }
  };

  // Устанавливаем категорию по умолчанию при загрузке
  useEffect(() => {
    if (defaultCategoryId && categories && !form.categoryId) {
      setForm(prev => ({ ...prev, categoryId: defaultCategoryId as any }));
    }
  }, [defaultCategoryId, categories, form.categoryId, setForm]);

  if (categories === undefined) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const categoryOptions = categories.map((category) => ({
    value: category._id,
    label: category.name,
  }));

  const headerActions = (
    <Button asChild variant="ghost" size="sm">
      <Link href="/menu">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Назад к меню
      </Link>
    </Button>
  );

  return (
    <Layout
      title="Создать блюдо"
      subtitle="Добавьте новое блюдо в меню ресторана"
      headerActions={headerActions}
    >
      <Card className="shadow-lg border-0">
        <CardHeader className="bg-gradient-to-r from-green-600 to-emerald-600 text-white">
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-6 h-6" />
            Новое блюдо
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          {/* Наименование */}
          <div className="space-y-2">
            <FormInput
              label="Наименование"
              value={form.name}
              onChange={(value) => setForm(prev => ({ ...prev, name: value }))}
              placeholder="Название блюда"
              required
              onKeyPress={(e) => e.key === "Enter" && handleSubmit()}
            />
          </div>

          {/* Категория */}
          <div className="space-y-2">
            <FormSelect
              label="Категория"
              value={form.categoryId}
              onChange={(value) => setForm(prev => ({ ...prev, categoryId: value as any }))}
              options={categoryOptions}
              placeholder="Выберите категорию"
              required
            />
          </div>

          {/* Артикул и Цена */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput
              label="Артикул"
              value={form.articleNumber.toString()}
              onChange={(value) => setForm(prev => ({ ...prev, articleNumber: parseInt(value) || 0 }))}
              placeholder="12345"
              type="number"
              required
            />

            <FormInput
              label="Цена (₽)"
              value={form.price.toString()}
              onChange={(value) => setForm(prev => ({ ...prev, price: parseFloat(value) || 0 }))}
              placeholder="0.00"
              type="number"
              step="0.01"
              required
            />
          </div>

          {/* Граммовка и Скидка */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput
              label="Граммовка (г)"
              value={form.weight.toString()}
              onChange={(value) => setForm(prev => ({ ...prev, weight: parseInt(value) || 0 }))}
              placeholder="300"
              type="number"
              required
            />

            <FormInput
              label="Скидка (₽)"
              value={form.discountPrice?.toString() || ""}
              onChange={(value) => setForm(prev => ({ ...prev, discountPrice: value ? parseFloat(value) : null }))}
              placeholder="0.00"
              type="number"
              step="0.01"
            />
          </div>

          {/* Баллы кэшбэка */}
          <div className="space-y-2">
            <FormInput
              label="Баллы кэшбэка за единицу"
              value={form.cashback_score?.toString() || ""}
              onChange={(value) => setForm(prev => ({ ...prev, cashback_score: value ? parseInt(value) : null }))}
              placeholder="0"
              type="number"
            />
          </div>

          {/* Состав */}
          <div className="space-y-2">
            <FormTextarea
              label="Состав"
              value={form.structure}
              onChange={(value) => setForm(prev => ({ ...prev, structure: value }))}
              placeholder="Описание состава блюда"
              rows={4}
              required
            />
          </div>

          {/* Фото */}
          <div className="space-y-2">
            <FormFileUpload
              label="Фото блюда"
              onFileSelect={handleFileUpload}
              accept="image/*"
              isUploading={isUploading}
              previewUrl={form.photo}
              onRemove={() => setForm(prev => ({ ...prev, photo: "" }))}
            />
            <p className="text-sm text-gray-500">
              Рекомендуемый размер: 800x600 пикселей. Поддерживаются форматы: JPG, PNG, GIF.
            </p>
          </div>

          <div className="space-y-2">
            <FormMultiFileUpload
              label="Галлерея блюда"
              onFileSelect={handleFilesUpload}
              accept="image/*"
              isUploading={isUploading}
              previewUrls={form.gallery}
              onRemove={() => setForm(prev => ({ ...prev, gallery: [] }))}
            />
            <p className="text-sm text-gray-500">
              Рекомендуемый размер: 800x600 пикселей. Поддерживаются форматы: JPG, PNG, GIF.
            </p>
          </div>



          {/* Ингредиенты */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="font-medium">Ингредиенты</div>
              <Input placeholder="Поиск продуктов" value={search} onChange={(e) => setSearch(e.target.value)} className="w-64" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Складские продукты</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="max-h-64 overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Продукт</TableHead>
                          <TableHead className="text-right">Добавить</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredProducts.map((p) => (
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
          </div>

          {/* Кнопки */}
          <div className="flex gap-4 pt-4">
            <Button
              onClick={handleSubmit}
              disabled={!form.name.trim() || !form.categoryId || isUploading}
              className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
              size="lg"
            >
              {isUploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Создание...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Создать блюдо
                </>
              )}
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
            >
              <Link href="/menu">
                Отмена
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Подсказки */}
      <Card className="mt-6 bg-green-50 border-green-200">
        <CardContent className="p-4">
          <h3 className="font-medium text-green-800 mb-2">💡 Советы по созданию блюда</h3>
          <ul className="text-sm text-green-700 space-y-1">
            <li>• Используйте понятные и аппетитные названия</li>
            <li>• Укажите точный состав для гостей</li>
            <li>• Добавьте качественное фото блюда</li>
            <li>• Установите корректную цену и вес</li>
            <li>• Используйте скидки для акционных блюд</li>
          </ul>
        </CardContent>
      </Card>
    </Layout>
  );
} 