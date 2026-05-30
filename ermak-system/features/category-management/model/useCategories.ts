import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Category, CreateCategoryData, UpdateCategoryData } from "../../../entities/category";

export function useCategories() {
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const categories = useQuery(api.restaurant.listCategories);
  const createCategory = useMutation(api.restaurant.createCategory);
  const updateCategory = useMutation(api.restaurant.updateCategory);
  const deleteCategory = useMutation(api.restaurant.deleteCategory);
  const generateUploadUrl = useMutation(api.restaurant.generateUploadUrl);
  const saveFileInfo = useMutation(api.restaurant.saveFileInfo);

  const handleCreateCategory = async (data: CreateCategoryData & { image?: File | undefined }) => {
    try {
      setIsUploading(true);
      
      let imageUrl: string | undefined;
      
      if (data.image) {
        const uploadUrl = await generateUploadUrl();
        const result = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": data.image.type },
          body: data.image,
        });
        
        if (!result.ok) {
          throw new Error("Ошибка при загрузке файла");
        }
        
        const { storageId } = await result.json();
        imageUrl = await saveFileInfo({ 
          storageId, 
          fileName: data.image.name 
        });
      }
      
      await createCategory({ 
        name: data.name,
        description: data.description,
        image: imageUrl,
      });
      
      return true;
    } catch (error) {
      console.error("Ошибка при создании категории:", error);
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  const handleUpdateCategory = async (data: UpdateCategoryData & { image?: File | undefined }) => {
    try {
      setIsUploading(true);
      
      // Сохраняем существующую картинку, если новую не грузили
      let imageUrl: string | undefined = (categories || []).find((c) => c._id === (data.categoryId as any))?.image || editingCategory?.image;
      
      if (data.image) {
        const uploadUrl = await generateUploadUrl();
        const result = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": data.image.type },
          body: data.image,
        });
        
        if (!result.ok) {
          throw new Error("Ошибка при загрузке файла");
        }
        
        const { storageId } = await result.json();
        imageUrl = await saveFileInfo({ 
          storageId, 
          fileName: data.image.name 
        });
      }
      
      await updateCategory({
        categoryId: data.categoryId,
        name: data.name,
        description: data.description,
        image: imageUrl,
      });
      
      setEditingCategory(null);
      return true;
    } catch (error) {
      console.error("Ошибка при обновлении категории:", error);
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    try {
      await deleteCategory({ categoryId: categoryId as any });
      return true;
    } catch (error) {
      console.error("Ошибка при удалении категории:", error);
      throw error;
    }
  };

  const startEditing = (category: Category) => {
    setEditingCategory(category);
  };

  const cancelEditing = () => {
    setEditingCategory(null);
  };

  return {
    categories,
    editingCategory,
    isUploading,
    handleCreateCategory,
    handleUpdateCategory,
    handleDeleteCategory,
    startEditing,
    cancelEditing,
  };
} 