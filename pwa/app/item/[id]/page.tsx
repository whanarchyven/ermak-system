"use client";

import { useQuery, useMutation } from "convex/react";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/convexApi";
import { rub } from "@/lib/format";
import { useCustomer } from "@/lib/useCustomer";
import FoodThumb from "@/components/FoodThumb";
import { ArrowLeft, Minus, Plus } from "lucide-react";

export default function ItemPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const item = useQuery(api.restaurant.getMenuPosition, { menuPositionId: id }) as any;
  const { clientId, isAuthenticated } = useCustomer();
  const addToCart = useMutation(api.clients.addToCart);
  const [qty, setQty] = useState(1);
  const [adding, setAdding] = useState(false);

  if (item === undefined) {
    return <div className="p-6 text-center text-neutral-400">Загрузка…</div>;
  }
  if (item === null) {
    return <div className="p-6 text-center text-neutral-400">Блюдо не найдено</div>;
  }

  const hasDiscount = typeof item.discountPrice === "number" && item.discountPrice < item.price;
  const unit = hasDiscount ? item.discountPrice : item.price;
  const photos: string[] = [item.photo, ...((item.gallery as string[]) ?? [])].filter(Boolean);

  const onAdd = async () => {
    if (!isAuthenticated || !clientId) {
      router.push(`/signin?redirect=/item/${id}`);
      return;
    }
    setAdding(true);
    await addToCart({ clientId, menuPositionId: id, quantity: qty });
    setAdding(false);
    toast.success(`Добавлено в корзину ×${qty}`);
    router.push("/cart");
  };

  return (
    <div className="md:py-6">
      <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-2 md:px-4">
        <div className="relative">
          <div className="aspect-square w-full overflow-hidden md:rounded-3xl">
            <FoodThumb src={photos[0]} alt={item.name} />
          </div>
          <button
            onClick={() => router.back()}
            className="absolute left-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 shadow"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        </div>

        <div className="px-4 pb-40 md:px-0 md:pb-0">
          <h1 className="text-2xl font-black md:text-3xl">{item.name}</h1>
          <div className="mt-1 text-sm text-neutral-400">{item.weight} г</div>
          {(item.cashback_score ?? 0) > 0 && (
            <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-[var(--bk-yellow)]/30 px-3 py-1 text-sm font-bold text-[var(--bk-brown)]">
              +{item.cashback_score} баллов за штуку
            </div>
          )}
          {item.description && <p className="mt-3 text-sm text-neutral-600">{item.description}</p>}
          <div className="mt-4">
            <div className="text-sm font-bold text-neutral-500">Состав</div>
            <p className="mt-1 text-sm text-neutral-600">{item.structure}</p>
          </div>

          {/* Десктоп: блок добавления в потоке страницы */}
          <div className="mt-6 hidden items-center gap-3 md:flex">
            <QtyAndAdd qty={qty} setQty={setQty} onAdd={onAdd} adding={adding} unit={unit} />
          </div>
        </div>
      </div>

      {/* Мобильный фиксированный блок — выше нижнего меню */}
      <div className="fixed bottom-20 left-1/2 z-40 w-full max-w-md -translate-x-1/2 border-t border-black/10 bg-white p-4 md:hidden">
        <div className="flex items-center gap-3">
          <QtyAndAdd qty={qty} setQty={setQty} onAdd={onAdd} adding={adding} unit={unit} />
        </div>
      </div>
    </div>
  );

  function QtyAndAdd(props: { qty: number; setQty: (f: (q: number) => number) => void; onAdd: () => void; adding: boolean; unit: number }) {
    return (
      <>
        <div className="flex items-center gap-3 rounded-full bg-neutral-100 px-2 py-1">
          <button
            onClick={() => props.setQty((q) => Math.max(1, q - 1))}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white shadow"
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="w-5 text-center font-bold">{props.qty}</span>
          <button
            onClick={() => props.setQty((q) => q + 1)}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white shadow"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <button
          onClick={props.onAdd}
          disabled={props.adding}
          className="flex flex-1 items-center justify-between rounded-full bg-[var(--bk-red)] px-5 py-3 font-black text-white active:scale-[0.99] disabled:opacity-60 md:flex-none md:gap-6"
        >
          <span>В корзину</span>
          <span>{rub(props.unit * props.qty)}</span>
        </button>
      </>
    );
  }
}
