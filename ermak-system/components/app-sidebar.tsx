"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Home, ChefHat, Truck, Salad, Boxes, Users, LogOut, Settings, Megaphone, Receipt, Factory, SlidersHorizontal } from "lucide-react";
import { Separator } from "./ui/separator";

type Role = "admin" | "bartender" | "cook" | "courier" | undefined;

interface AppSidebarProps {
  initialRole?: Role;
}

export function AppSidebar({ initialRole }: AppSidebarProps) {
  const pathname = usePathname();
  const me = useQuery(api.users.me);
  const settings = useQuery(api.settings.get);
  const role: Role = (me as any)?.role ?? initialRole;

  useEffect(() => {
    if (role) document.cookie = `app_role=${role}; path=/`;
  }, [role]);

  const items = useMemo(() => {
    const all = [
      { title: "Главная", url: "/", icon: Home },
      { title: "Заказы", url: "/orders", icon: Receipt },
      { title: "Кухня", url: "/kitchen", icon: ChefHat },
      { title: "Доставки", url: "/deliveries", icon: Truck },
      { title: "Меню", url: "/menu", icon: Salad },
      { title: "Склад", url: "/warehouse", icon: Boxes },
      { title: "Клиенты", url: "/clients", icon: Megaphone },
      { title: "Цеха", url: "/workshops", icon: Factory },
      { title: "Сотрудники", url: "/employees", icon: Users },
      { title: "Промокоды", url: "/promocodes", icon: Settings },
      { title: "Финансы", url: "/transactions", icon: Receipt },
      { title: "Настройки", url: "/settings", icon: SlidersHorizontal },
    ];
    if (role === "bartender") return all.filter((i) => i.url === "/");
    if (role === "cook") return all.filter((i) => i.url === "/kitchen");
    if (role === "courier") return all.filter((i) => i.url === "/deliveries");
    return role === "admin" ? all : all.filter((i) => i.url === "/"); // admin -> все, остальные -> главная
  }, [role]);

  const isActive = (href: string) => pathname === href;

  return (
    pathname === "/signin" ? null : (
    <Sidebar className="shadow-xl">
      <SidebarHeader>
        <SidebarGroup>
          <div className="flex items-center gap-2">
            <img src={(settings as any)?.logoUrl || "/logo.png"} alt="Logo" className="w-10 h-10 rounded object-contain" />
            <p className="text-xl font-bold">{(settings as any)?.brandName ? `Кафе ${(settings as any).brandName}` : "Кафе Ермак"}</p>
          </div>
          <Separator className="my-4" />
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarHeader>

      <SidebarContent />

      <SidebarFooter>
        <SidebarGroup>
          <SidebarGroupLabel>{(me as any)?.email || "Гость"}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/logout">
                    <LogOut />
                    <span>Выйти</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarFooter>
    </Sidebar>
    )
  );
}


