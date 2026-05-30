import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";

export interface ProductForm {
  name: string;
  unit: string;
  priceBaseQty: number;
  priceForBase: number;
  estimate: number;
  safeEstimate: number;
}

export function useProducts() {
  const [form, setForm] = useState<ProductForm>({ name: "", unit: "шт", priceBaseQty: 1, priceForBase: 0, estimate: 0, safeEstimate: 0 });
  const [adjustQty, setAdjustQty] = useState<number>(0);
  const [adjustComment, setAdjustComment] = useState<string>("");

  const products = useQuery(api.warehouse.listProducts);
  const createProduct = useMutation(api.warehouse.createProduct);
  const updateProduct = useMutation(api.warehouse.updateProduct);
  const deleteProduct = useMutation(api.warehouse.deleteProduct);
  const adjustEstimate = useMutation(api.warehouse.adjustEstimate);
  const listTransactionsByProduct = useQuery as unknown as (fn: any, args?: any) => any; // usage per-call in pages

  const handleCreate = async () => {
    if (!form.name.trim() || !form.unit.trim() || form.priceBaseQty <= 0 || form.priceForBase < 0 || form.estimate < 0 || form.safeEstimate < 0) {
      alert("Проверьте корректность полей");
      return;
    }
    await createProduct({ name: form.name.trim(), unit: form.unit.trim(), priceBaseQty: form.priceBaseQty, priceForBase: form.priceForBase, estimate: form.estimate, safeEstimate: form.safeEstimate });
    setForm({ name: "", unit: "шт", priceBaseQty: 1, priceForBase: 0, estimate: 0, safeEstimate: 0 });
  };

  const handleUpdate = async (productId: Id<"products">, data: { name: string; unit: string; priceBaseQty: number; priceForBase: number; safeEstimate: number }) => {
    if (!data.name.trim() || !data.unit.trim() || data.priceBaseQty <= 0 || data.priceForBase < 0 || data.safeEstimate < 0) {
      alert("Проверьте корректность полей");
      return;
    }
    await updateProduct({ productId, name: data.name.trim(), unit: data.unit.trim(), priceBaseQty: data.priceBaseQty, priceForBase: data.priceForBase, safeEstimate: data.safeEstimate });
  };

  const handleDelete = async (productId: Id<"products">) => {
    if (!confirm("Удалить продукт?")) return;
    await deleteProduct({ productId });
  };

  const handleAdjust = async (productId: Id<"products">, type: "plus" | "minus", quantity: number, comment?: string) => {
    if (quantity <= 0) {
      alert("Количество должно быть > 0");
      return;
    }
    await adjustEstimate({ productId, type, quantity, comment });
    setAdjustQty(0);
    setAdjustComment("");
  };

  return {
    products,
    form,
    setForm,
    handleCreate,
    handleUpdate,
    handleDelete,
    handleAdjust,
    adjustQty,
    setAdjustQty,
    adjustComment,
    setAdjustComment,
    listTransactionsByProduct,
  };
}


