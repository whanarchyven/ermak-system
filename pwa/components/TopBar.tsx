"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { ShoppingBag } from "lucide-react";
import { useCustomer } from "@/lib/useCustomer";
import { useSiteSettings } from "@/lib/useSiteSettings";
import NotificationBell from "@/components/NotificationBell";

const navLinks = [
  { href: "/", label: "Меню" },
  { href: "/promos", label: "Акции" },
  { href: "/orders", label: "Заказы" },
  { href: "/profile", label: "Профиль" },
];

export default function TopBar() {
  const pathname = usePathname();
  const { me } = useCustomer();
  const settings = useSiteSettings();
  const cartCount = me?.cartCount ?? 0;

  return (
    <header className="sticky top-0 z-50 w-full bg-[var(--bk-red)] text-white shadow-sm">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-4 py-2.5">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-white">
            <Image src={settings.logoUrl || "/logo.png"} alt={settings.brandName} width={36} height={36} className="object-contain" />
          </span>
          <span className="hidden text-lg font-black tracking-tight sm:block">{settings.brandName?.toUpperCase()}</span>
        </Link>

        <nav className="ml-4 hidden items-center gap-1 md:flex">
          {navLinks.map((l) => {
            const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ${
                  active ? "bg-white text-[var(--bk-brown)]" : "text-white/85 hover:bg-white/15"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/cart"
            aria-label="Корзина"
            className="relative hidden h-10 w-10 items-center justify-center rounded-full bg-white/15 transition-colors hover:bg-white/25 md:inline-flex"
          >
            <ShoppingBag className="h-5 w-5" />
            {cartCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--bk-yellow)] px-1 text-[10px] font-bold text-[var(--bk-brown)]">
                {cartCount}
              </span>
            )}
          </Link>
          <NotificationBell />
        </div>
      </div>
    </header>
  );
}
