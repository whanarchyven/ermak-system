import { Id } from "../../../convex/_generated/dataModel";

export interface Category {
  _id: Id<"categories">;
  _creationTime: number;
  name: string;
  description?: string;
  image?: string;
}

export interface CreateCategoryData {
  name: string;
  description?: string;
  image?: string;
}

export interface UpdateCategoryData {
  categoryId: Id<"categories">;
  name: string;
  description?: string;
  image?: string;
} 