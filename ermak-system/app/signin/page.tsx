"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SignIn() {
  const { signIn } = useAuthActions();
  const [flow] = useState<"signIn" | "signUp">("signIn");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="w-full max-w-md rounded-2xl border bg-white/80 backdrop-blur p-8 shadow-xl">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-2 size-12 rounded-full bg-black/90" />
          <h1 className="text-2xl font-semibold text-gray-900">Вход в систему</h1>
          <p className="text-sm text-gray-500">Пожалуйста, авторизуйтесь</p>
        </div>
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.target as HTMLFormElement);
          formData.set("flow", flow);
          void signIn("password", formData)
            .catch((error) => {
              setError(error.message);
            })
            .then(() => {
              router.push("/");
            });
        }}
      >
        <input
          className="rounded-lg p-2 border focus:outline-none focus:ring-2 focus:ring-gray-900/30"
          type="email"
          name="email"
          placeholder="Email"
        />
        <input
          className="rounded-lg p-2 border focus:outline-none focus:ring-2 focus:ring-gray-900/30"
          type="password"
          name="password"
          placeholder="Пароль"
        />
        <button
          className="rounded-lg bg-black py-2 text-white hover:bg-gray-800 transition"
          type="submit"
        >
          Войти
        </button>
        <div className="flex flex-row gap-2 text-sm text-gray-600">
          <span>Нет аккаунта? Обратитесь к администратору</span>
        </div>
        {error && (
          <div className="bg-red-50 border-2 border-red-200 rounded-md p-2">
            <p className="text-red-700 font-mono text-xs">Ошибка входа: {error}</p>
          </div>
        )}
      </form>
      </div>
    </div>
  );
}
