"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Utensils } from "lucide-react";
import { Layout } from "../../widgets/layout";
import { MenuPositionCard } from "../../entities/menu-position";
import { useMenu } from "../../features/menu-management";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu";

export default function MenuPage() {
  const router = useRouter();

  const {
    categories,
    menuPositions,
    editingPosition,
    form,
    isUploading,
    handleFileUpload,
    handleUpdatePosition,
    handleDeletePosition,
    startEditing,
    cancelEditing,
    setForm,
  } = useMenu();

  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  useEffect(() => {
    if (!activeCategory && categories && categories.length > 0) {
      setActiveCategory(categories[0]._id);
    }
  }, [categories, activeCategory]);
  const filteredPositions = (menuPositions || []).filter((p) => !activeCategory || p.categoryId === activeCategory);

  if (categories === undefined || menuPositions === undefined) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const categoryOptions = categories.map((category) => ({ value: category._id, label: category.name }));

  const headerActions = (
    <>
      <Button
        asChild
        className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
      >
        <Link href={`/menu/create`}>
          <Plus className="w-4 h-4 mr-2" />
          Добавить блюдо
        </Link>
      </Button>
    </>
  );

  return (
    <Layout
      title="Меню ресторана"
      subtitle="Управление позициями меню"
      headerActions={headerActions}
    >
      {/* Табы категорий с контекстным меню и плюсом создания */}
      <Tabs value={activeCategory || undefined} onValueChange={(v: string) => setActiveCategory(v)} className="mb-6">
        <TabsList className="flex flex-wrap gap-2 !bg-transparent !p-0 !rounded-none h-auto">
          {categories.map((c) => (
            <ContextMenu key={c._id}>
              <ContextMenuTrigger asChild>
                <TabsTrigger
                  value={c._id}
                  className={`${activeCategory === c._id ? 'bg-black text-white' : 'text-gray-700 hover:bg-gray-100'} px-3 py-2 rounded-md transition-colors grow-0`}
                >
                  {c.name}
                </TabsTrigger>
              </ContextMenuTrigger>
              <ContextMenuContent className="min-w-[160px] p-1">
                <ContextMenuItem onSelect={() => router.push(`/categories/${c._id}/edit`)}>Редактировать</ContextMenuItem>
                <ContextMenuItem onSelect={() => router.push(`/categories/${c._id}/delete`)}>Удалить</ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
          ))}
          <TabsTrigger value="__new__" className=" px-3 py-2 rounded-md hover:bg-gray-100" onClick={() => router.push(`/categories/create`)}>
            <Plus className="w-4 h-4" />
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Редактирование блюда вынесено на отдельную страницу */}

      {/* Список позиций меню */}
      {filteredPositions.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <Utensils className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-xl font-medium text-gray-900 mb-2">Блюда не найдены</h3>
            <p className="text-gray-500 mb-6">
              {activeCategory ? "В выбранной категории пока нет блюд" : "Создайте первое блюдо для меню ресторана"}
            </p>
            <Button
              asChild
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
            >
              <Link href={`/menu/create`}>
                <Plus className="w-4 h-4 mr-2" />
                Добавить блюдо
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPositions.map((position) => (
            <MenuPositionCard
              key={position._id}
              position={position}
              onEdit={() => router.push(`/menu/${position._id}/edit`)}
              onDelete={handleDeletePosition}
            />
          ))}
        </div>
      )}
    </Layout>
  );
} 