"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth } from "convex/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import BrandHeader from "@/components/BrandHeader";

function normalizePhone(raw: string): string {
  const digits = raw.replace(/[^\d+]/g, "");
  return digits;
}

function SignInInner() {
  const { signIn } = useAuthActions();
  const { isAuthenticated } = useConvexAuth();
  const router = useRouter();
  const params = useSearchParams();
  const redirect = params.get("redirect") || "/";

  const [flow, setFlow] = useState<"signIn" | "signUp">("signIn");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (isAuthenticated) router.replace(redirect);
  }, [isAuthenticated, redirect, router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const ph = normalizePhone(phone);
    if (ph.length < 6) {
      setError("Введите корректный номер телефона");
      return;
    }
    if (password.length < 6) {
      setError("Пароль должен быть не короче 6 символов");
      return;
    }
    setBusy(true);
    try {
      const args: Record<string, string> = { email: ph, phone: ph, password, flow };
      if (flow === "signUp" && name.trim()) args.name = name.trim();
      await signIn("password", args);
      router.replace(redirect);
    } catch (err: any) {
      setError(
        flow === "signIn"
          ? "Неверный телефон или пароль"
          : "Не удалось зарегистрироваться. Возможно, номер уже занят."
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <BrandHeader
        title={flow === "signIn" ? "Вход" : "Регистрация"}
        subtitle="По номеру телефона и паролю"
      />
      <form onSubmit={submit} className="space-y-4 px-4 py-6">
        {flow === "signUp" && (
          <Field label="Имя">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 outline-none focus:border-[var(--bk-red)]"
              placeholder="Как к вам обращаться"
            />
          </Field>
        )}
        <Field label="Телефон">
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            inputMode="tel"
            className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 outline-none focus:border-[var(--bk-red)]"
            placeholder="+7 999 123-45-67"
          />
        </Field>
        <Field label="Пароль">
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 outline-none focus:border-[var(--bk-red)]"
            placeholder="Минимум 6 символов"
          />
        </Field>

        {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-full bg-[var(--bk-red)] py-3 font-black text-white active:scale-[0.99] disabled:opacity-60"
        >
          {busy ? "Подождите…" : flow === "signIn" ? "Войти" : "Зарегистрироваться"}
        </button>

        <button
          type="button"
          onClick={() => {
            setError(null);
            setFlow((f) => (f === "signIn" ? "signUp" : "signIn"));
          }}
          className="w-full text-center text-sm font-semibold text-[var(--bk-red)]"
        >
          {flow === "signIn" ? "Нет аккаунта? Зарегистрироваться" : "Уже есть аккаунт? Войти"}
        </button>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-bold text-neutral-500">{label}</span>
      {children}
    </label>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<div className="p-6 text-center text-neutral-400">Загрузка…</div>}>
      <SignInInner />
    </Suspense>
  );
}
