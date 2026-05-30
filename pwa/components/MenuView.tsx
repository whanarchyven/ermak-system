"use client";

import { useQuery } from "convex/react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { api } from "@/lib/convexApi";
import { rub } from "@/lib/format";
import AddToCartButton from "@/components/AddToCartButton";
import FoodThumb from "@/components/FoodThumb";

type Category = { _id: string; name: string };
type Item = {
  _id: string;
  name: string;
  categoryId: string;
  price: number;
  discountPrice?: number;
  photo?: string;
  weight: number;
  cashback_score?: number;
  description?: string;
};

export default function MenuView() {
  const categories = useQuery(api.restaurant.listCategories) as Category[] | undefined;
  const positions = useQuery(api.restaurant.listMenuPositions, {}) as Item[] | undefined;
  const [active, setActive] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const map = new Map<string, Item[]>();
    (positions ?? []).forEach((p) => {
      const arr = map.get(p.categoryId) ?? [];
      arr.push(p);
      map.set(p.categoryId, arr);
    });
    return map;
  }, [positions]);

  if (!categories || !positions) {
    return <div className="p-6 text-center text-neutral-400">Загрузка меню…</div>;
  }

  const visibleCategories = active ? categories.filter((c) => c._id === active) : categories;

  return (
    <div>
      {/* Чипсы категорий */}
      <div className="no-scrollbar sticky top-14 z-30 flex gap-2 overflow-x-auto bg-[var(--bk-cream)] px-4 py-3">
        <Chip label="Всё" active={active === null} onClick={() => setActive(null)} />
        {categories.map((c) => (
          <Chip key={c._id} label={c.name} active={active === c._id} onClick={() => setActive(c._id)} />
        ))}
      </div>

      <div className="space-y-6 px-4 pb-6">
        {visibleCategories.map((cat) => {
          const items = grouped.get(cat._id) ?? [];
          if (items.length === 0) return null;
          return (
            <section key={cat._id}>
              <h2 className="mb-3 text-lg font-black text-[var(--bk-brown)]">{cat.name}</h2>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {items.map((it) => (
                  <ItemCard key={it._id} item={it} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-bold transition-colors ${
        active ? "bg-[var(--bk-red)] text-white" : "bg-white text-[var(--bk-brown)]"
      }`}
    >
      {label}
    </button>
  );
}

function ItemCard({ item }: { item: Item }) {
  const hasDiscount = typeof item.discountPrice === "number" && item.discountPrice! < item.price;
  return (
    <div className="flex gap-3 rounded-2xl bg-white p-3 shadow-sm">
      <Link href={`/item/${item._id}`} className="h-24 w-24 shrink-0 overflow-hidden rounded-xl">
        <FoodThumb src={item.photo} alt={item.name} />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col">
        <Link href={`/item/${item._id}`} className="line-clamp-1 font-bold">
          {item.name}
        </Link>
        <p className="line-clamp-2 text-xs text-neutral-500">{item.description || item.name}</p>
        <div className="mt-1 text-xs text-neutral-400">{item.weight} г</div>
        {(item.cashback_score ?? 0) > 0 && (
          <div className="mt-1 inline-flex w-fit items-center gap-1 rounded-full bg-[var(--bk-yellow)]/30 px-2 py-0.5 text-[11px] font-bold text-[var(--bk-brown)]">
            +{item.cashback_score} баллов
          </div>
        )}
        <div className="mt-auto flex items-center justify-between pt-2">
          <div className="font-black">
            {hasDiscount ? (
              <span className="flex items-baseline gap-1">
                <span className="text-[var(--bk-red)]">{rub(item.discountPrice)}</span>
                <span className="text-xs text-neutral-400 line-through">{rub(item.price)}</span>
              </span>
            ) : (
              rub(item.price)
            )}
          </div>
          <AddToCartButton menuPositionId={item._id} />
        </div>
      </div>
    </div>
  );
}
