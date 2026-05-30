"use client";

import { useQuery, useMutation } from "convex/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/convexApi";
import { rub } from "@/lib/format";
import { useCustomer } from "@/lib/useCustomer";
import BrandHeader from "@/components/BrandHeader";
import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react";

export default function CartPage() {
  const router = useRouter();
  const { me, clientId, isAuthenticated, isLoading } = useCustomer();

  const cart = useQuery(api.clients.getCartDetails, clientId ? { clientId } : "skip") as any;
  const preview = useQuery(api.orders.getPreview, clientId ? { clientId } : "skip") as any;

  const setQty = useMutation(api.clients.setCartQuantity);
  const removeItem = useMutation(api.clients.removeFromCart);
  const startCheckout = useMutation(api.orders.startCheckout);
  const setOrderType = useMutation(api.orders.setOrderType);
  const setAddress = useMutation(api.orders.setAddress);
  const setPayment = useMutation(api.orders.setPaymentMethod);
  const setTempClient = useMutation(api.orders.setTempClient);
  const setRedeemPoints = useMutation(api.orders.setRedeemPoints);
  const applyPromocode = useMutation(api.orders.applyPromocode);
  const confirmOrder = useMutation(api.orders.confirmOrder);

  const [type, setType] = useState<"delivery" | "self-service">("self-service");
  const [address, setAddress2] = useState("");
  const [payment, setPaymentM] = useState<"cash" | "card">("cash");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [redeem, setRedeem] = useState(0);
  const [promo, setPromo] = useState("");
  const [promoMsg, setPromoMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const cartSignature = useMemo(
    () => (cart?.items ?? []).map((i: any) => `${i.menuPositionId}:${i.quantity}`).join(","),
    [cart]
  );

  // Синхронизируем черновик заказа с корзиной
  useEffect(() => {
    if (clientId && (cart?.items?.length ?? 0) > 0) {
      startCheckout({ clientId }).catch(() => {});
    }
  }, [clientId, cartSignature, startCheckout, cart?.items?.length]);

  // Префилл имени/телефона
  useEffect(() => {
    if (me) {
      setName((n) => n || me.name || "");
      setPhone((p) => p || me.phone || "");
    }
  }, [me]);

  if (isLoading) return <div className="p-6 text-center text-neutral-400">Загрузка…</div>;

  if (!isAuthenticated) {
    return (
      <div>
        <BrandHeader title="Корзина" />
        <EmptyState
          text="Войдите, чтобы оформить заказ"
          actionHref="/signin?redirect=/cart"
          actionLabel="Войти"
        />
      </div>
    );
  }

  const items = cart?.items ?? [];
  if (items.length === 0) {
    return (
      <div>
        <BrandHeader title="Корзина" />
        <EmptyState text="Корзина пуста" actionHref="/" actionLabel="В меню" />
      </div>
    );
  }

  const maxRedeem = Math.min(
    preview?.loyaltyBalance ?? 0,
    (preview?.subtotal ?? 0) - (preview?.discountTotal ?? 0) + (preview?.deliveryFee ?? 0)
  );

  const onApplyType = async (t: "delivery" | "self-service") => {
    setType(t);
    if (clientId) await setOrderType({ clientId, type: t });
  };

  const onConfirm = async () => {
    if (!clientId) return;
    if (!name.trim() || phone.trim().length < 6) {
      setPromoMsg("Укажите имя и телефон");
      toast.error("Укажите имя и телефон");
      return;
    }
    if (type === "delivery" && !address.trim()) {
      setPromoMsg("Укажите адрес доставки");
      toast.error("Укажите адрес доставки");
      return;
    }
    setSubmitting(true);
    try {
      await setTempClient({ clientId, name: name.trim(), phone: phone.trim() });
      await setOrderType({ clientId, type });
      if (type === "delivery") await setAddress({ clientId, address: address.trim() });
      await setPayment({ clientId, method: payment });
      await setRedeemPoints({ clientId, points: redeem });
      const res: any = await confirmOrder({ clientId });
      if (res?.ok) {
        toast.success("Заказ оформлен! Следите за статусом в «Заказы».");
        router.replace("/orders");
      } else {
        setPromoMsg(res?.error || "Не удалось оформить заказ");
        toast.error(res?.error || "Не удалось оформить заказ");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const onApplyPromo = async () => {
    if (!clientId || !promo.trim()) return;
    const res: any = await applyPromocode({ clientId, code: promo.trim() });
    setPromoMsg(res?.message ?? null);
    if (res?.ok || res?.applied) toast.success(res?.message || "Промокод применён");
    else toast.error(res?.message || "Промокод не применён");
  };

  return (
    <div>
      <BrandHeader title="Корзина" subtitle="Проверьте заказ и оформите" />

      <div className="space-y-4 px-4 py-4 md:mx-auto md:max-w-2xl">
        {/* Позиции */}
        <div className="space-y-2 rounded-2xl bg-white p-3 shadow-sm">
          {items.map((it: any) => (
            <div key={it.menuPositionId} className="flex items-center gap-3 border-b border-black/5 py-2 last:border-0">
              <div className="min-w-0 flex-1">
                <div className="line-clamp-1 font-bold">{it.name}</div>
                <div className="text-sm text-neutral-400">{rub(it.unitPrice)}</div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => clientId && setQty({ clientId, menuPositionId: it.menuPositionId, quantity: it.quantity - 1 })}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-5 text-center font-bold">{it.quantity}</span>
                <button
                  onClick={() => clientId && setQty({ clientId, menuPositionId: it.menuPositionId, quantity: it.quantity + 1 })}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100"
                >
                  <Plus className="h-4 w-4" />
                </button>
                <button
                  onClick={() => clientId && removeItem({ clientId, menuPositionId: it.menuPositionId })}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-red-500"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Способ получения */}
        <Section title="Способ получения">
          <div className="grid grid-cols-2 gap-2">
            <Toggle active={type === "self-service"} onClick={() => onApplyType("self-service")} label="Самовывоз" />
            <Toggle active={type === "delivery"} onClick={() => onApplyType("delivery")} label="Доставка" />
          </div>
          {type === "delivery" && (
            <div className="mt-3">
              {(me?.address_pool ?? []).length > 0 && (
                <div className="mb-2 flex flex-wrap gap-2">
                  {me!.address_pool.map((a: any, i: number) => (
                    <button
                      key={i}
                      onClick={() => setAddress2(a.address)}
                      className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold"
                    >
                      {a.address}
                    </button>
                  ))}
                </div>
              )}
              <input
                value={address}
                onChange={(e) => setAddress2(e.target.value)}
                placeholder="Адрес доставки"
                className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 outline-none focus:border-[var(--bk-red)]"
              />
            </div>
          )}
        </Section>

        {/* Контакты */}
        <Section title="Контакты">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Имя"
            className="mb-2 w-full rounded-xl border border-black/10 bg-white px-4 py-3 outline-none focus:border-[var(--bk-red)]"
          />
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            inputMode="tel"
            placeholder="Телефон"
            className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 outline-none focus:border-[var(--bk-red)]"
          />
        </Section>

        {/* Оплата */}
        <Section title="Оплата">
          <div className="grid grid-cols-2 gap-2">
            <Toggle active={payment === "cash"} onClick={() => setPaymentM("cash")} label="Наличные" />
            <Toggle active={payment === "card"} onClick={() => setPaymentM("card")} label="Картой" />
          </div>
        </Section>

        {/* Промокод */}
        <Section title="Промокод">
          <div className="flex gap-2">
            <input
              value={promo}
              onChange={(e) => setPromo(e.target.value)}
              placeholder="Введите код"
              className="flex-1 rounded-xl border border-black/10 bg-white px-4 py-3 uppercase outline-none focus:border-[var(--bk-red)]"
            />
            <button onClick={onApplyPromo} className="rounded-xl bg-[var(--bk-brown)] px-4 font-bold text-white">
              ОК
            </button>
          </div>
        </Section>

        {/* Баллы */}
        {maxRedeem > 0 && (
          <Section title={`Списать баллы (доступно ${preview?.loyaltyBalance ?? 0})`}>
            <input
              type="range"
              min={0}
              max={maxRedeem}
              value={Math.min(redeem, maxRedeem)}
              onChange={(e) => setRedeem(parseInt(e.target.value))}
              className="w-full accent-[var(--bk-red)]"
            />
            <div className="mt-1 text-sm font-bold">К списанию: {redeem} баллов = −{rub(redeem)}</div>
          </Section>
        )}

        {/* Итоги */}
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <Row label="Сумма" value={rub(preview?.subtotal)} />
          {(preview?.discountTotal ?? 0) > 0 && <Row label="Скидка" value={`−${rub(preview?.discountTotal)}`} />}
          {(preview?.deliveryFee ?? 0) > 0 && <Row label="Доставка" value={rub(preview?.deliveryFee)} />}
          {(preview?.redeemApplied ?? 0) > 0 && <Row label="Баллы" value={`−${rub(preview?.redeemApplied)}`} />}
          <div className="mt-2 flex items-center justify-between border-t border-black/10 pt-2 text-lg font-black">
            <span>Итого</span>
            <span>{rub(preview?.total)}</span>
          </div>
          {(preview?.pointsEarned ?? 0) > 0 && (
            <div className="mt-1 text-sm font-bold text-[var(--bk-red)]">
              + {preview?.pointsEarned} баллов после заказа
            </div>
          )}
        </div>

        {promoMsg && <div className="rounded-xl bg-neutral-100 px-4 py-3 text-sm">{promoMsg}</div>}

        <button
          onClick={onConfirm}
          disabled={submitting}
          className="w-full rounded-full bg-[var(--bk-red)] py-3 font-black text-white active:scale-[0.99] disabled:opacity-60"
        >
          {submitting ? "Оформляем…" : `Оформить заказ · ${rub(preview?.total)}`}
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

function Toggle({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl py-2 font-bold transition-colors ${
        active ? "bg-[var(--bk-red)] text-white" : "bg-neutral-100 text-[var(--bk-brown)]"
      }`}
    >
      {label}
    </button>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-0.5 text-sm">
      <span className="text-neutral-500">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

function EmptyState({ text, actionHref, actionLabel }: { text: string; actionHref: string; actionLabel: string }) {
  return (
    <div className="flex flex-col items-center gap-4 px-6 py-16 text-center">
      <ShoppingBag className="h-14 w-14 text-neutral-300" />
      <div className="text-lg font-bold text-neutral-500">{text}</div>
      <Link href={actionHref} className="rounded-full bg-[var(--bk-red)] px-6 py-3 font-black text-white">
        {actionLabel}
      </Link>
    </div>
  );
}
