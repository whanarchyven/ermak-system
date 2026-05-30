"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Category } from "../../../entities/category";

interface CategoryFilterProps {
  categories: Category[];
  className?: string;
}

export function CategoryFilter({ categories, className = "" }: CategoryFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentCategory = searchParams.get("category");

  const handleCategoryChange = (categoryId: string | null) => {
    const params = new URLSearchParams(searchParams);
    
    if (categoryId) {
      params.set("category", categoryId);
    } else {
      params.delete("category");
    }
    
    router.push(`/menu?${params.toString()}`);
  };

  return (
    <div className={`flex gap-2 overflow-x-auto pb-2 ${className}`}>
      <Button
        variant={!currentCategory ? "default" : "outline"}
        size="sm"
        onClick={() => handleCategoryChange(null)}
        className="whitespace-nowrap flex-shrink-0"
      >
        Все
      </Button>
      
      {categories.map((category) => (
        <Button
          key={category._id}
          variant={currentCategory === category._id ? "default" : "outline"}
          size="sm"
          onClick={() => handleCategoryChange(category._id)}
          className="whitespace-nowrap flex-shrink-0"
        >
          {category.name}
        </Button>
      ))}
    </div>
  );
} 