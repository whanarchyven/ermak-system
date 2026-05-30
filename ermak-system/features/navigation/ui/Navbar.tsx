"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Image from "next/image";
import { ClientAvatar } from "@/widgets/client-avatar/ui/ClientAvatar";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

interface NavbarProps {
  className?: string;
  initialRole?: "admin" | "bartender" | "cook" | "courier" | undefined;
}

export function Navbar({ className = "", initialRole }: NavbarProps) {
  const pathname = usePathname();
  const me = useQuery(api.users.me);

  const allItems = [
    { href: "/", label: "Главная" },
    { href: "/kitchen", label: "Кухня" },
    { href: "/deliveries", label: "Доставки" },
    { href: "/menu", label: "Меню" },
    { href: "/warehouse", label: "Склад" },
    { href: "/employees", label: "Сотрудники" },
  ];
  const role = (me as any)?.role ?? initialRole;
  const navItems = role === "bartender"
    ? allItems.filter((i) => i.href === "/")
    : role === "cook"
      ? allItems.filter((i) => i.href === "/kitchen")
      : role === "courier"
        ? allItems.filter((i) => i.href === "/deliveries")
      : allItems;

  useEffect(() => {
    if (role) {
      document.cookie = `app_role=${role}; path=/`;
    }
  }, [role]);

  if (pathname === "/signin") return null;

  const clientName=process.env.NEXT_PUBLIC_CLIENT_NAME;

  return (
    <nav className={`bg-white shadow-md ${className}`}>
      <div className="max-w-7xl justify-between  flex py-2 items-center mx-auto px-4 sm:px-6 lg:px-8">
        <ClientAvatar />
        <div className="flex items-center gap-6">
          <div className="flex space-x-8">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  isActive
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
          </div>
          <UserMenu email={(me as any)?.email} />
        </div>
      </div>
    </nav>
  );
} 

function UserMenu({ email }: { email?: string }) {
  const [open, setOpen] = useState(false);
  if (!email) return null;
  return (
    <div className="relative">
      <button onClick={() => setOpen((v) => !v)} className="text-sm text-gray-700 hover:text-black border rounded-md px-3 py-1">
        {email}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-40 rounded-md border bg-white shadow-md z-50">
          <Link href="/logout" className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">Выйти</Link>
        </div>
      )}
    </div>
  );
}