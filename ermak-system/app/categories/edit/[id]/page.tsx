"use client";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormInput } from "@/components/ui/form-input";
import { FormTextarea } from "@/components/ui/form-textarea";
import { FormFileUpload } from "@/components/ui/form-file-upload";
import { useCategories } from "../../../../features/category-management";

export default function EditCategoryPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const { categories, handleUpdateCategory, isUploading } = useCategories();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(undefined);

  useEffect(() => {
    const cat = (categories || []).find((c) => c._id === id);
    if (cat) {
      setName(cat.name);
      setDescription(cat.description || "");
      setPreviewUrl(cat.image);
    }
  }, [categories, id]);

  const handleSubmit = async () => {
    await handleUpdateCategory({ categoryId: id as any, name, description, image: image || undefined });
    router.push("/menu");
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Редактировать категорию</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormInput label="Название" value={name} onChange={setName} required />
          <FormTextarea label="Описание" value={description} onChange={setDescription} rows={4} />
          <FormFileUpload label="Изображение" onFileSelect={(f) => { setImage(f); if (f) setPreviewUrl(URL.createObjectURL(f)); }} isUploading={isUploading} previewUrl={previewUrl} onRemove={() => { setImage(null); setPreviewUrl(undefined); }} />
          <div className="flex gap-2">
            <Button onClick={handleSubmit} disabled={!name.trim() || isUploading}>Сохранить</Button>
            <Button variant="outline" onClick={() => router.push("/menu")}>Отмена</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


