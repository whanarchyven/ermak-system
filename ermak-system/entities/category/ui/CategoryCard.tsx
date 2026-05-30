import { Category } from "../model/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, Image as ImageIcon } from "lucide-react";
import Link from "next/link";

interface CategoryCardProps {
  category: Category;
  onEdit: (category: Category) => void;
  onDelete: (categoryId: string) => void;
  isEditing?: boolean;
  editForm?: React.ReactNode;
}

export function CategoryCard({ 
  category, 
  onEdit, 
  onDelete, 
  isEditing = false, 
  editForm 
}: CategoryCardProps) {
  if (isEditing && editForm) {
    return (
      <Card className="hover:shadow-lg transition-all duration-200">
        <CardContent className="p-6 space-y-4">
          {editForm}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="hover:shadow-lg transition-all duration-200 hover:-translate-y-1">
      <div className="relative">
        {category.image ? (
          <img
            src={category.image}
            alt={category.name}
            className="w-full h-48 object-cover rounded-t-lg"
          />
        ) : (
          <div className="w-full h-48 bg-gradient-to-br from-gray-100 to-gray-200 rounded-t-lg flex items-center justify-center">
            <ImageIcon className="w-12 h-12 text-gray-400" />
          </div>
        )}
        <div className="absolute top-3 right-3 flex gap-2">
          <Button
            onClick={() => onEdit(category)}
            variant="secondary"
            size="sm"
            className="bg-white/90 hover:bg-white"
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            onClick={() => onDelete(category._id)}
            variant="destructive"
            size="sm"
            className="bg-red-500/90 hover:bg-red-500"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
      <CardContent className="p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">{category.name}</h3>
        {category.description && (
          <p className="text-gray-600 text-sm mb-4 line-clamp-2">{category.description}</p>
        )}
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">
            ID: {category._id.slice(-8)}
          </span>
          <Button asChild variant="outline" size="sm">
            <Link href={`/menu?category=${category._id}`}>
              Просмотреть блюда
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
} 