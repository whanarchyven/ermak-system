import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";

interface MenuPositionForm {
  name: string;
  categoryId: Id<"categories">;
  articleNumber: number;
  price: number;
  photo: string;
  gallery:string[]
  weight: number;
  description?:string;
  structure: string;
  discountPrice: number | null;
  cashback_score: number | null;
  ingredients?: { productId: Id<"products">; quantity: number }[];
}

export function useMenu() {
  const [editingPosition, setEditingPosition] = useState<{
    id: Id<"menuPositions">;
    form: MenuPositionForm;
  } | null>(null);
  const [form, setForm] = useState<MenuPositionForm>({
    name: "",
    categoryId: "" as Id<"categories">,
    articleNumber: 0,
    price: 0,
    photo: "",
    gallery:[],
    weight: 0,
    structure: "",
    description:"",
    discountPrice: null,
    cashback_score: null,
    ingredients: [],
  });
  const [isUploading, setIsUploading] = useState(false);

  const categories = useQuery(api.restaurant.listCategories);
  const menuPositions = useQuery(api.restaurant.listMenuPositions,{});
  const createMenuPosition = useMutation(api.restaurant.createMenuPosition);
  const updateMenuPosition = useMutation(api.restaurant.updateMenuPosition);
  const deleteMenuPosition = useMutation(api.restaurant.deleteMenuPosition);
  const generateUploadUrl = useMutation(api.restaurant.generateUploadUrl);
  const saveFileInfo = useMutation(api.restaurant.saveFileInfo);

  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    try {
      // Используем Convex Storage вместо ImageBan
      const uploadUrl = await generateUploadUrl();
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      
      if (!result.ok) {
        throw new Error("Ошибка загрузки изображения");
      }
      
      const { storageId } = await result.json();
      const imageUrl = await saveFileInfo({ 
        storageId, 
        fileName: file.name 
      });
      
      setForm(prev => ({ ...prev, photo: imageUrl }));
      return imageUrl;
    } catch (error) {
      console.error("Ошибка при загрузке изображения:", error);
      alert("Ошибка при загрузке изображения");
    } finally {
      setIsUploading(false);
    }
  };

  const handleFilesUpload = async (files: File[]) => {
    setIsUploading(true);
    try {
      const uploadedUrls: string[] = [];
  
      for (const file of files) {
        // 1. Получаем upload URL
        const uploadUrl = await generateUploadUrl();
  
        // 2. Отправляем файл
        const result = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });
  
        if (!result.ok) {
          throw new Error("Ошибка загрузки файла");
        }
  
        // 3. Получаем storageId и сохраняем метаданные в Convex
        const { storageId } = await result.json();
        const imageUrl = await saveFileInfo({
          storageId,
          fileName: file.name,
        });
  
        uploadedUrls.push(imageUrl);
      }

      console.log(uploadedUrls,"Uploaded urls")
  
      // например, сохраняем массив URL-ов в состоянии формы
      setForm(prev => ({ ...prev, gallery: uploadedUrls }));
      return uploadedUrls;
    } catch (error) {
      console.error("Ошибка при загрузке файлов:", error);
      alert("Ошибка при загрузке файлов");
    } finally {
      setIsUploading(false);
    }
  };

  const handleCreatePosition = async () => {
    if (!form.name.trim() || !form.categoryId || form.articleNumber <= 0 || form.price <= 0 || form.weight <= 0 || !form.structure.trim()) {
      alert("Пожалуйста, заполните все обязательные поля");
      return;
    }

    try {
      await createMenuPosition({
        name: form.name.trim(),
        categoryId: form.categoryId,
        articleNumber: form.articleNumber,
        price: form.price,
        photo: form.photo || undefined,
        gallery: form.gallery,
        description: form.description || undefined,
        weight: form.weight,
        structure: form.structure.trim(),
        discountPrice: form.discountPrice || undefined,
        cashback_score: form.cashback_score ?? undefined,
        ingredients: (form.ingredients || []) as any,
      });
      
      // Сброс формы
      setForm({
        name: "",
        categoryId: "" as Id<"categories">,
        articleNumber: 0,
        price: 0,
        photo: "",
        gallery:[],
        description:"",
        weight: 0,
        structure: "",
        discountPrice: null,
        cashback_score: null,
        ingredients: [],
      });
    } catch (error) {
      console.error("Ошибка при создании позиции меню:", error);
      alert("Ошибка при создании позиции меню");
    }
  };

  const handleUpdatePosition = async () => {
    // Мягкая валидация без редиректов/сбросов
    if (!form.name.trim() || !form.categoryId || form.articleNumber <= 0 || form.price <= 0 || form.weight <= 0 || !form.structure.trim()) {
      alert("Пожалуйста, заполните все обязательные поля");
      return;
    }
    try {
      await updateMenuPosition({
        menuPositionId: (editingPosition?.id ?? ("" as Id<"menuPositions">)) as Id<"menuPositions">,
        name: form.name.trim(),
        categoryId: form.categoryId,
        articleNumber: form.articleNumber,
        price: form.price,
        photo: form.photo || undefined,
        gallery: form.gallery,
        description: form.description || undefined,
        weight: form.weight,
        structure: form.structure.trim(),
        discountPrice: form.discountPrice || undefined,
        cashback_score: form.cashback_score ?? undefined,
        ingredients: (form.ingredients || []) as any,
      });
    } catch (error) {
      console.error("Ошибка при обновлении позиции меню:", error);
      alert("Ошибка при обновлении позиции меню");
    }
  };

  const handleDeletePosition = async (positionId: Id<"menuPositions">) => {
    if (!confirm("Вы уверены, что хотите удалить эту позицию меню?")) return;

    try {
      await deleteMenuPosition({ menuPositionId: positionId });
    } catch (error) {
      console.error("Ошибка при удалении позиции меню:", error);
      alert("Ошибка при удалении позиции меню");
    }
  };

  const startEditing = (position: any) => {
    setEditingPosition({
      id: position._id,
      form: {
        name: position.name,
        categoryId: position.categoryId,
        articleNumber: position.articleNumber,
        price: position.price,
        gallery:position.gallery,
        description:position.description,
        photo: position.photo || "",
        weight: position.weight,
        structure: position.structure,
        discountPrice: position.discountPrice,
        cashback_score: position.cashback_score ?? null,
      },
    });
    setForm({
      name: position.name,
      categoryId: position.categoryId,
      articleNumber: position.articleNumber,
      price: position.price,
      photo: position.photo || "",
      gallery:position.gallery,
      description:position.description,
      weight: position.weight,
      structure: position.structure,
      discountPrice: position.discountPrice,
      cashback_score: position.cashback_score ?? null,
    });
  };

  const cancelEditing = () => {
    setEditingPosition(null);
    setForm({
      name: "",
      categoryId: "" as Id<"categories">,
      articleNumber: 0,
      price: 0,
      photo: "",
      gallery:[],
      description:"",
      weight: 0,
      structure: "",
      discountPrice: null,
      cashback_score: null,
    });
  };

  return {
    categories,
    menuPositions,
    editingPosition,
    form,
    isUploading,
    handleFileUpload,
    handleFilesUpload,
    handleCreatePosition,
    handleUpdatePosition,
    handleDeletePosition,
    startEditing,
    cancelEditing,
    setForm,
  };
} 