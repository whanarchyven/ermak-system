"use client";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCategories } from "../../../../features/category-management";

export default function DeleteCategoryPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const { categories, handleDeleteCategory } = useCategories();
  const cat = (categories || []).find((c) => c._id === id);

  const onDelete = async () => {
    await handleDeleteCategory(id);
    router.push("/menu");
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Удалить категорию</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>Вы уверены, что хотите удалить категорию "{cat?.name}"?</p>
          <div className="flex gap-2">
            <Button variant="destructive" onClick={onDelete}>Удалить</Button>
            <Button variant="outline" onClick={() => router.push("/menu")}>Отмена</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


