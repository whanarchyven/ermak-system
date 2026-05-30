"use client";
import { useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";

export default function PostLoginPage() {
  const me = useQuery(api.users.me);
  const router = useRouter();

  useEffect(() => {
    if (!me) return;
    const role = (me as any)?.role;
    if (role === "cook") router.replace("/kitchen");
    else router.replace("/");
  }, [me, router]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <p className="text-sm text-gray-600">Входим…</p>
    </div>
  );
}


