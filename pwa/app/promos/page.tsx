"use client";

import { useQuery } from "convex/react";
import Link from "next/link";
import { api } from "@/lib/convexApi";
import { rub } from "@/lib/format";
import BrandHeader from "@/components/BrandHeader";
import FoodThumb from "@/components/FoodThumb";
import { useSiteSettings } from "@/lib/useSiteSettings";
import { toast } from "sonner";
import { Tag, Copy } from "lucide-react";

export default function PromosPage() {
  const settings = useSiteSettings();
  const promos = useQuery(api.restaurant.listPromocodes) as any[] | undefined;
  const positions = useQuery(api.restaurant.listMenuPositions, {}) as any[] | undefined;

  const activePromos = (promos ?? []).filter(
    (p) => p.isActive && (!p.expiresAt || p.expiresAt > Date.now())
  );
  const discounted = (positions ?? []).filter(
    (p) => typeof p.discountPrice === "number" && p.discountPrice < p.price
  );

  return (
    <div>
      <BrandHeader title={settings.promoTitle} subtitle={settings.promoSubtitle} />
      <div className="space-y-6 px-4 py-4 md:mx-auto md:max-w-4xl">
        <section>
          <h2 className="mb-2 font-black text-[var(--bk-brown)]">Промокоды</h2>
          {activePromos.length === 0 ? (
            <div className="rounded-2xl bg-white p-4 text-sm text-neutral-400 shadow-sm">
              Пока нет активных промокодов
            </div>
          ) : (
            <div className="space-y-2">
              {activePromos.map((p) => (
                <div
                  key={p._id}
                  className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-[var(--bk-orange)] to-[var(--bk-red)] p-4 text-white shadow-md"
                >
                  <Tag className="h-7 w-7" />
                  <div className="min-w-0 flex-1">
                    <div className="font-black">{p.name || "Промокод"}</div>
                    <div className="text-sm text-white/85">
                      {p.type === "percent" ? `−${p.value}%` : `−${rub(p.value)}`}
                      {p.condThresholdEnabled && p.condThresholdValue ? ` от ${rub(p.condThresholdValue)}` : ""}
                    </div>
                  </div>
                  <button
                    onClick={() => { navigator.clipboard?.writeText(p.code); toast.success(`Промокод ${p.code} скопирован`); }}
                    className="flex items-center gap-1 rounded-full bg-white/20 px-3 py-1 text-sm font-bold"
                  >
                    {p.code} <Copy className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-2 font-black text-[var(--bk-brown)]">Блюда со скидкой</h2>
          {discounted.length === 0 ? (
            <div className="rounded-2xl bg-white p-4 text-sm text-neutral-400 shadow-sm">
              Сейчас нет скидок на блюда
            </div>
          ) : (
            <div className="space-y-3">
              {discounted.map((it) => (
                <Link
                  key={it._id}
                  href={`/item/${it._id}`}
                  className="flex gap-3 rounded-2xl bg-white p-3 shadow-sm"
                >
                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl">
                    <FoodThumb src={it.photo} alt={it.name} />
                  </div>
                  <div className="flex flex-1 flex-col justify-center">
                    <div className="font-bold">{it.name}</div>
                    <div className="flex items-baseline gap-2">
                      <span className="font-black text-[var(--bk-red)]">{rub(it.discountPrice)}</span>
                      <span className="text-sm text-neutral-400 line-through">{rub(it.price)}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
