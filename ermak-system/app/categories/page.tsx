"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FormInput } from "@/components/ui/form-input";
import { FormTextarea } from "@/components/ui/form-textarea";
import { FormFileUpload } from "@/components/ui/form-file-upload";
import { Plus, FileText, Image as ImageIcon, ArrowRight } from "lucide-react";
import { Layout } from "../../widgets/layout";
import { CategoryCard } from "../../entities/category";
import { useCategories } from "../../features/category-management";
import { StatisticsCard } from "../../shared/ui";
import { useState } from "react";

export default function CategoriesPage() {
  const {
    categories,
    editingCategory,
    isUploading,
    handleUpdateCategory,
    handleDeleteCategory,
    startEditing,
    cancelEditing,
  } = useCategories();

  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editImage, setEditImage] = useState<File | null>(null);

  const handleEdit = (category: any) => {
    startEditing(category);
    setEditName(category.name);
    setEditDescription(category.description || "");
    setEditImage(null);
  };

  const handleSaveEdit = async () => {
    if (!editingCategory || !editName.trim()) return;
    
    try {
      await handleUpdateCategory({
        categoryId: editingCategory._id,
        name: editName.trim(),
        description: editDescription.trim() || undefined,
        image: editImage || undefined,
      });
      
      setEditName("");
      setEditDescription("");
      setEditImage(null);
    } catch (error) {
      alert("Ошибка при обновлении категории");
    }
  };

  const handleDelete = async (categoryId: string) => {
    if (!confirm("Вы уверены, что хотите удалить эту категорию?")) return;
    
    try {
      await handleDeleteCategory(categoryId);
    } catch (error) {
      alert("Ошибка при удалении категории. Возможно, в этой категории есть позиции меню.");
    }
  };

  const handleCancelEdit = () => {
    cancelEditing();
    setEditName("");
    setEditDescription("");
    setEditImage(null);
  };

  if (categories === undefined) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const headerActions = (
    <>
      <Button asChild className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
        <Link href="/categories/create">
          <Plus className="w-4 h-4 mr-2" />
          Создать категорию
        </Link>
      </Button>
      <Button asChild variant="outline">
        <Link href="/menu">
          Перейти к меню
        </Link>
      </Button>
    </>
  );

  return (
    <Layout
      title="Категории блюд"
      subtitle="Управление категориями меню ресторана"
      headerActions={headerActions}
    >
      {/* Статистика */}
      {/* <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatisticsCard
          title="Всего категорий"
          value={categories.length}
          icon={FileText}
          gradient="bg-gradient-to-r from-blue-500 to-blue-600"
        />
        <StatisticsCard
          title="С изображениями"
          value={categories.filter(c => c.image).length}
          icon={ImageIcon}
          gradient="bg-gradient-to-r from-green-500 to-green-600"
        />
        <StatisticsCard
          title="С описанием"
          value={categories.filter(c => c.description).length}
          icon={ArrowRight}
          gradient="bg-gradient-to-r from-purple-500 to-purple-600"
        />
      </div> */}

      {/* Список категорий */}
      {categories.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <FileText className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-xl font-medium text-gray-900 mb-2">Категории не найдены</h3>
            <p className="text-gray-500 mb-6">Создайте первую категорию для организации меню</p>
            <Button asChild className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
              <Link href="/categories/create">
                <Plus className="w-4 h-4 mr-2" />
                Создать категорию
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((category) => (
            <CategoryCard
              key={category._id}
              category={category}
              onEdit={handleEdit}
              onDelete={handleDelete}
              isEditing={editingCategory?._id === category._id}
              editForm={
                editingCategory?._id === category._id ? (
                  <div className="space-y-4">
                    <FormInput
                      label="Название"
                      value={editName}
                      onChange={setEditName}
                      onKeyPress={(e) => e.key === "Enter" && handleSaveEdit()}
                    />
                    <FormTextarea
                      label="Описание"
                      value={editDescription}
                      onChange={setEditDescription}
                      rows={3}
                    />
                    <FormFileUpload
                      label="Изображение"
                      onFileSelect={setEditImage}
                      accept="image/*"
                      isUploading={isUploading}
                      previewUrl={editImage ? URL.createObjectURL(editImage) : editingCategory.image}
                      onRemove={() => setEditImage(null)}
                    />
                    <div className="flex gap-2">
                      <Button
                        onClick={handleSaveEdit}
                        disabled={isUploading}
                        size="sm"
                      >
                        {isUploading ? "Сохранение..." : "Сохранить"}
                      </Button>
                      <Button
                        onClick={handleCancelEdit}
                        variant="outline"
                        size="sm"
                      >
                        Отмена
                      </Button>
                    </div>
                  </div>
                ) : undefined
              }
            />
          ))}
        </div>
      )}
    </Layout>
  );
} 