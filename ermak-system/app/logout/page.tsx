"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthActions } from "@convex-dev/auth/react";

export default function LogoutPage() {
  const router = useRouter();
  const { signOut } = useAuthActions();

  useEffect(() => {
    (async () => {
      try {
        await signOut();
      } finally {
        router.replace("/signin");
      }
    })();
  }, [router, signOut]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <p className="text-sm text-gray-600">Выходим из системы…</p>
    </div>
  );
}


