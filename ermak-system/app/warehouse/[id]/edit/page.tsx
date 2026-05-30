"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormInput } from "@/components/ui/form-input";
import { useProducts } from "@/features/warehouse";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as Id<"products">;
  const product = useQuery(api.warehouse.getProduct, id ? { productId: id } : "skip");
  const { handleUpdate } = useProducts();

  const [name, setName] = useState("");
  const [unit, setUnit] = useState("шт");
  const [priceBaseQty, setPriceBaseQty] = useState(1);
  const [priceForBase, setPriceForBase] = useState(0);
  const [safeEstimate, setSafeEstimate] = useState(0);

  useEffect(() => {
    if (product) {
      setName(product.name);
      setUnit(product.unit);
      setPriceBaseQty(product.priceBaseQty);
      setPriceForBase(product.priceForBase);
      setSafeEstimate(product.safeEstimate);
    }
  }, [product]);

  const submit = async () => {
    await handleUpdate(id, { name, unit, priceBaseQty, priceForBase, safeEstimate });
    router.push("/warehouse");
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Редактировать продукт</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormInput label="Название" value={name} onChange={setName} required />
          <FormInput label="Ед. изм." value={unit} onChange={setUnit} required />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormInput label={`Цена за (${unit}) кол-во`} type="number" value={priceBaseQty.toString()} onChange={(v) => setPriceBaseQty(parseFloat(v) || 0)} required />
            <FormInput label="= Стоимость (₽)" type="number" value={priceForBase.toString()} onChange={(v) => setPriceForBase(parseFloat(v) || 0)} required />
          </div>
          <FormInput label="Безопасный остаток" type="number" value={safeEstimate.toString()} onChange={(v) => setSafeEstimate(parseFloat(v) || 0)} required />
          <div className="flex gap-2">
            <Button onClick={submit}>Сохранить</Button>
            <Button variant="outline" onClick={() => router.push("/warehouse")}>Отмена</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


