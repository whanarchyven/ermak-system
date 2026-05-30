"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormInput } from "@/components/ui/form-input";
import { useProducts } from "../../../features/warehouse";

export default function CreateProductPage() {
  const router = useRouter();
  const { form, setForm, handleCreate } = useProducts();
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    try {
      await handleCreate();
      router.push("/warehouse");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Создать продукт</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormInput label="Название" value={form.name} onChange={(v) => setForm((p) => ({ ...p, name: v }))} required />
          <FormInput label="Ед. изм." value={form.unit} onChange={(v) => setForm((p) => ({ ...p, unit: v }))} required />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormInput label={`Цена за (${form.unit}) кол-во`} type="number" value={form.priceBaseQty.toString()} onChange={(v) => setForm((p) => ({ ...p, priceBaseQty: parseFloat(v) || 0 }))} required />
            <FormInput label="= Стоимость (₽)" type="number" value={form.priceForBase.toString()} onChange={(v) => setForm((p) => ({ ...p, priceForBase: parseFloat(v) || 0 }))} required />
          </div>
          <FormInput label="Остаток" type="number" value={form.estimate.toString()} onChange={(v) => setForm((p) => ({ ...p, estimate: parseFloat(v) || 0 }))} required />
          <FormInput label="Безопасный остаток" type="number" value={form.safeEstimate.toString()} onChange={(v) => setForm((p) => ({ ...p, safeEstimate: parseFloat(v) || 0 }))} required />
          <div className="flex gap-2">
            <Button onClick={submit} disabled={loading}>Сохранить</Button>
            <Button variant="outline" onClick={() => router.push("/warehouse")}>Отмена</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


