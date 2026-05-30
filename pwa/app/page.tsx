"use client";

import Link from "next/link";
import BrandHeader from "@/components/BrandHeader";
import MenuView from "@/components/MenuView";
import { useCustomer } from "@/lib/useCustomer";
import { useSiteSettings } from "@/lib/useSiteSettings";
import { Tag, Star } from "lucide-react";

export default function HomePage() {
  const { me, isAuthenticated } = useCustomer();
  const settings = useSiteSettings();
  return (
    <div>
      <BrandHeader />

      <div className="px-4 py-4">
        <div className="grid gap-3 md:grid-cols-2">
          <Link
            href="/promos"
            className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-[var(--bk-orange)] to-[var(--bk-red)] p-4 text-white shadow-md"
          >
            <Tag className="h-7 w-7" />
            <div>
              <div className="font-black">{settings.promoTitle}</div>
              <div className="text-sm text-white/85">{settings.promoSubtitle}</div>
            </div>
          </Link>

          {isAuthenticated && (
            <div className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm">
              <Star className="h-7 w-7 text-[var(--bk-yellow)]" fill="currentColor" />
              <div>
                <div className="text-sm text-neutral-500">Ваши баллы</div>
                <div className="text-xl font-black text-[var(--bk-brown)]">
                  {me?.loyaltyPoints ?? 0}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <MenuView />
    </div>
  );
}
