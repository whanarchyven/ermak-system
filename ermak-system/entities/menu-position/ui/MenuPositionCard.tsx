import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit, Trash2 } from "lucide-react";

interface MenuPosition {
  _id: string;
  name: string;
  categoryId: string;
  categoryName: string;
  articleNumber: number;
  price: number;
  photo?: string;
  weight: number;
  structure: string;
  discountPrice?: number;
}

interface MenuPositionCardProps {
  position: MenuPosition;
  onEdit: (position: MenuPosition) => void;
  onDelete: (positionId: any) => void;
}

export function MenuPositionCard({ position, onEdit, onDelete }: MenuPositionCardProps) {
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-all duration-200 hover:-translate-y-1">
      {position.photo && (
        <div className="aspect-video overflow-hidden">
          <img
            src={position.photo}
            alt={position.name}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <CardContent className="p-4">
        <h4 className="font-semibold text-gray-800 mb-2">{position.name}</h4>
        <p className="text-sm text-gray-600 mb-2">Категория: {position.categoryName}</p>
        <p className="text-sm text-gray-600 mb-2">Артикул: {position.articleNumber}</p>
        <p className="text-sm text-gray-600 mb-2">Вес: {position.weight}г</p>
        
        <div className="flex justify-between items-center mb-2">
          <span className="text-lg font-bold text-green-600">
            {position.discountPrice ? (
              <span>
                <span className="line-through text-gray-400">{position.price}₽</span>
                <span className="ml-2">{position.discountPrice}₽</span>
              </span>
            ) : (
              `${position.price}₽`
            )}
          </span>
        </div>
        
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{position.structure}</p>
        
        <div className="flex gap-2">
          <Button
            onClick={() => onEdit(position)}
            variant="outline"
            size="sm"
            className="flex-1"
          >
            <Edit className="w-4 h-4 mr-1" />
            Изменить
          </Button>
          <Button
            onClick={() => onDelete(position._id)}
            variant="destructive"
            size="sm"
            className="flex-1"
          >
            <Trash2 className="w-4 h-4 mr-1" />
            Удалить
          </Button>
        </div>
      </CardContent>
    </Card>
  );
} 