"use client";

import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/convexApi";
import { useCustomer } from "@/lib/useCustomer";
import { Plus, Check } from "lucide-react";

export default function AddToCartButton({
  menuPositionId,
  className,
}: {
  menuPositionId: string;
  className?: string;
}) {
  const router = useRouter();
  const { clientId, isAuthenticated } = useCustomer();
  const addToCart = useMutation(api.clients.addToCart);
  const [done, setDone] = useState(false);

  const onClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated || !clientId) {
      router.push("/signin?redirect=/");
      return;
    }
    await addToCart({ clientId, menuPositionId, quantity: 1 });
    setDone(true);
    toast.success("Добавлено в корзину");
    setTimeout(() => setDone(false), 1000);
  };

  return (
    <button
      onClick={onClick}
      className={
        className ??
        "flex h-10 w-10 items-center justify-center rounded-full bg-[var(--bk-red)] text-white shadow-md active:scale-95"
      }
      aria-label="Добавить в корзину"
    >
      {done ? <Check className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
    </button>
  );
}
