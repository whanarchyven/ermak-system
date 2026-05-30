"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormInput } from "@/components/ui/form-input";
import { FormTextarea } from "@/components/ui/form-textarea";
import { FormFileUpload } from "@/components/ui/form-file-upload";
import { ArrowLeft, Plus } from "lucide-react";
import { useCategories } from "../../../features/category-management";

export default function CreateCategoryPage() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState<File | null>(null);

  const { handleCreateCategory, isUploading } = useCategories();

  const handleSubmit = async () => {
    if (!name.trim()) return;
    
    try {
      await handleCreateCategory({ 
        name: name.trim(),
        description: description.trim() || undefined,
        image: image || undefined,
      });
      
      // Перенаправляем на страницу категорий
      window.location.href = "/categories";
    } catch (error) {
      alert("Ошибка при создании категории");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center gap-4">
              <Button asChild variant="ghost" size="sm">
                <Link href="/categories">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  
                </Link>
              </Button>
              <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold text-gray-900">Создать категорию</h1>
                <p className="text-gray-600 mt-1">Добавьте новую категорию блюд</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <Card className="shadow-lg border-0">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
            <CardTitle className="flex items-center gap-2">
              <Plus className="w-6 h-6" />
              Новая категория
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {/* Название */}
            <div className="space-y-2">
              <FormInput
                label="Название категории"
                value={name}
                onChange={setName}
                placeholder="Например: Основные блюда"
                required
                onKeyPress={(e) => e.key === "Enter" && handleSubmit()}
              />
            </div>

            {/* Описание */}
            <div className="space-y-2">
              <FormTextarea
                label="Описание"
                value={description}
                onChange={setDescription}
                placeholder="Краткое описание категории..."
                rows={4}
              />
            </div>

            {/* Изображение */}
            <div className="space-y-2">
              <FormFileUpload
                label="Изображение категории"
                onFileSelect={setImage}
                accept="image/*"
                isUploading={isUploading}
                previewUrl={image ? URL.createObjectURL(image) : undefined}
                onRemove={() => setImage(null)}
              />
              <p className="text-sm text-gray-500">
                Рекомендуемый размер: 400x400 пикселей. Поддерживаются форматы: JPG, PNG, GIF.
              </p>
            </div>

            {/* Кнопки */}
            <div className="flex gap-4 pt-4">
              <Button
                onClick={handleSubmit}
                disabled={!name.trim() || isUploading}
                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
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
                    Создать категорию
                  </>
                )}
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
              >
                <Link href="/categories">
                  Отмена
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Подсказки */}
        <Card className="mt-6 bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <h3 className="font-medium text-blue-800 mb-2">💡 Советы по созданию категории</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Используйте понятные и короткие названия</li>
              <li>• Добавьте описание для лучшего понимания</li>
              <li>• Выберите качественное изображение</li>
              <li>• Примеры категорий: "Основные блюда", "Десерты", "Напитки"</li>
            </ul>
          </CardContent>
        </Card>
      </main>
    </div>
  );
} 