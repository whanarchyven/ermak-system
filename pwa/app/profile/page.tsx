"use client";

import { useQuery, useMutation } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/convexApi";
import { rub } from "@/lib/format";
import { useCustomer } from "@/lib/useCustomer";
import BrandHeader from "@/components/BrandHeader";
import PushToggle from "@/components/PushToggle";
import { Star, LogOut, MapPin, Trash2, User } from "lucide-react";

export default function ProfilePage() {
  const { signOut } = useAuthActions();
  const { me, isAuthenticated, isLoading } = useCustomer();
  const loyalty = useQuery(api.customer.getLoyalty, isAuthenticated ? {} : "skip") as any;

  const updateName = useMutation(api.customer.updateName);
  const addAddress = useMutation(api.customer.addAddress);
  const removeAddress = useMutation(api.customer.removeAddress);

  const [name, setName] = useState("");
  const [newAddr, setNewAddr] = useState("");

  useEffect(() => {
    if (me?.name) setName(me.name);
  }, [me?.name]);

  if (isLoading) return <div className="p-6 text-center text-neutral-400">Загрузка…</div>;

  if (!isAuthenticated) {
    return (
      <div>
        <BrandHeader title="Профиль" />
        <div className="flex flex-col items-center gap-4 px-6 py-16 text-center">
          <User className="h-14 w-14 text-neutral-300" />
          <div className="text-lg font-bold text-neutral-500">Вы не авторизованы</div>
          <Link href="/signin?redirect=/profile" className="rounded-full bg-[var(--bk-red)] px-6 py-3 font-black text-white">
            Войти
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <BrandHeader title={me?.name ? `Привет, ${me.name}!` : "Профиль"} subtitle={me?.phone} />

      <div className="space-y-4 px-4 py-4 md:mx-auto md:max-w-2xl">
        {/* Баллы */}
        <div className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-[var(--bk-orange)] to-[var(--bk-red)] p-4 text-white shadow-md">
          <Star className="h-8 w-8" fill="currentColor" />
          <div>
            <div className="text-sm text-white/85">Баланс баллов</div>
            <div className="text-3xl font-black">{loyalty?.balance ?? me?.loyaltyPoints ?? 0}</div>
          </div>
        </div>

        {/* Имя */}
        <Section title="Имя">
          <div className="flex gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="flex-1 rounded-xl border border-black/10 bg-white px-4 py-3 outline-none focus:border-[var(--bk-red)]"
            />
            <button
              onClick={async () => { if (name.trim()) { await updateName({ name: name.trim() }); toast.success("Имя сохранено"); } }}
              className="rounded-xl bg-[var(--bk-brown)] px-4 font-bold text-white"
            >
              ОК
            </button>
          </div>
        </Section>

        {/* Адреса */}
        <Section title="Адреса доставки">
          <div className="space-y-2">
            {(me?.address_pool ?? []).map((a: any, i: number) => (
              <div key={i} className="flex items-center gap-2 rounded-xl bg-neutral-100 px-3 py-2">
                <MapPin className="h-4 w-4 text-neutral-500" />
                <span className="flex-1 text-sm">{a.address}</span>
                <button onClick={async () => { await removeAddress({ index: i }); toast.success("Адрес удалён"); }} className="text-red-500">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            <div className="flex gap-2">
              <input
                value={newAddr}
                onChange={(e) => setNewAddr(e.target.value)}
                placeholder="Новый адрес"
                className="flex-1 rounded-xl border border-black/10 bg-white px-4 py-3 outline-none focus:border-[var(--bk-red)]"
              />
              <button
                onClick={async () => {
                  if (!newAddr.trim()) return;
                  await addAddress({ address: { address: newAddr.trim() } });
                  setNewAddr("");
                  toast.success("Адрес добавлен");
                }}
                className="rounded-xl bg-[var(--bk-brown)] px-4 font-bold text-white"
              >
                +
              </button>
            </div>
          </div>
        </Section>

        {/* Уведомления */}
        <Section title="Уведомления">
          <PushToggle />
        </Section>

        {/* История баллов */}
        <Section title="История баллов">
          {(loyalty?.transactions ?? []).length === 0 ? (
            <div className="text-sm text-neutral-400">Пока нет операций</div>
          ) : (
            <div className="space-y-1">
              {loyalty.transactions.map((t: any) => (
                <div key={t._id} className="flex items-center justify-between text-sm">
                  <span className="text-neutral-500">
                    {t.reason === "accrue" ? "Начисление" : t.reason === "redeem" ? "Списание" : "Корректировка"}
                  </span>
                  <span className={t.delta >= 0 ? "font-bold text-green-600" : "font-bold text-red-500"}>
                    {t.delta >= 0 ? "+" : ""}
                    {t.delta}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Section>

        <button
          onClick={() => signOut()}
          className="flex w-full items-center justify-center gap-2 rounded-full border border-red-200 py-3 font-bold text-red-500"
        >
          <LogOut className="h-5 w-5" /> Выйти
        </button>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <div className="mb-2 font-black text-[var(--bk-brown)]">{title}</div>
      {children}
    </div>
  );
}
