"use client";

import { useQuery, useMutation } from "convex/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/convexApi";
import { useCustomer } from "@/lib/useCustomer";
import { Bell, BellOff } from "lucide-react";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export default function PushToggle() {
  const { isAuthenticated } = useCustomer();
  const vapid = useQuery(api.customer.getVapidPublicKey) as string | null | undefined;
  const save = useMutation(api.customer.savePushSubscription);
  const [state, setState] = useState<"idle" | "on" | "busy" | "unsupported">("idle");

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setState("unsupported");
      return;
    }
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setState(sub ? "on" : "idle"))
      .catch(() => {});
  }, []);

  const enable = async () => {
    if (!vapid || !isAuthenticated) return;
    setState("busy");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState("idle");
        toast.error("Доступ к уведомлениям не предоставлен");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapid) as unknown as BufferSource,
      });
      const json = sub.toJSON() as any;
      await save({
        endpoint: json.endpoint,
        p256dh: json.keys.p256dh,
        auth: json.keys.auth,
        userAgent: navigator.userAgent,
      });
      setState("on");
      toast.success("Push-уведомления включены");
    } catch {
      setState("idle");
      toast.error("Не удалось включить уведомления");
    }
  };

  if (state === "unsupported") {
    return <div className="text-sm text-neutral-400">Push-уведомления не поддерживаются этим браузером</div>;
  }

  if (state === "on") {
    return (
      <div className="flex items-center gap-2 text-sm font-semibold text-green-600">
        <Bell className="h-5 w-5" /> Уведомления включены
      </div>
    );
  }

  return (
    <button
      onClick={enable}
      disabled={state === "busy" || !vapid}
      className="flex items-center gap-2 rounded-full bg-[var(--bk-brown)] px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
    >
      <BellOff className="h-5 w-5" />
      {state === "busy" ? "Подключаем…" : "Включить уведомления"}
    </button>
  );
}
