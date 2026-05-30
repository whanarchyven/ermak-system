"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ShoppingBag, ClipboardList, User, Tag } from "lucide-react";
import { useCustomer } from "@/lib/useCustomer";

const items = [
  { href: "/", label: "Меню", icon: Home },
  { href: "/promos", label: "Акции", icon: Tag },
  { href: "/cart", label: "Корзина", icon: ShoppingBag },
  { href: "/orders", label: "Заказы", icon: ClipboardList },
  { href: "/profile", label: "Профиль", icon: User },
];

export default function BottomNav() {
  const pathname = usePathname();
  const { me } = useCustomer();
  const cartCount = me?.cartCount ?? 0;

  return (
    <nav className="fixed bottom-0 left-1/2 z-40 w-full max-w-md -translate-x-1/2 border-t border-black/10 bg-white">
      <div className="grid grid-cols-5">
        {items.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`relative flex flex-col items-center gap-1 py-2 text-[11px] font-semibold transition-colors ${
                active ? "text-[var(--bk-red)]" : "text-neutral-400"
              }`}
            >
              <Icon className="h-6 w-6" strokeWidth={active ? 2.6 : 2} />
              {label}
              {href === "/cart" && cartCount > 0 && (
                <span className="absolute right-4 top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--bk-red)] px-1 text-[10px] font-bold text-white">
                  {cartCount}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
