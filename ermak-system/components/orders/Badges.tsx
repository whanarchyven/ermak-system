"use client";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export function ElapsedBadge({ createdAt, baseMs = 10 * 60 * 1000 }: { createdAt: number; baseMs?: number }) {
  const [now, setNow] = useState<number>(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const elapsed = Math.max(0, now - createdAt);
  const ratio = elapsed / baseMs;
  const mins = Math.floor(elapsed / 60000);
  const secs = Math.floor((elapsed % 60000) / 1000);
  const label = `${mins}:${secs.toString().padStart(2, "0")}`;
  let textColor = "text-emerald-600";
  let dotColor = "bg-emerald-600";
  if (ratio >= 0.75) { textColor = "text-red-600"; dotColor = "bg-red-600"; }
  else if (ratio >= 0.5) { textColor = "text-orange-500"; dotColor = "bg-orange-500"; }
  return (
    <div className={cn("flex items-center gap-2 text-sm font-medium", textColor)}>
      <span className={cn("inline-block size-2 rounded-full", dotColor)} />
      <span>{label}</span>
    </div>
  );
}

export function RemainingBadge({ dueAt, acceptedAt, forceWhite }: { dueAt?: number; acceptedAt?: number; forceWhite?: boolean }) {
  const [now, setNow] = useState<number>(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  if (!dueAt || !acceptedAt) return null;
  const total = Math.max(1, dueAt - acceptedAt);
  const remaining = dueAt - now; // может уходить в минус
  const ratio = remaining / total; // 1 -> 0 -> отрицательное
  const abs = Math.abs(remaining);
  const mins = Math.floor(abs / 60000);
  const secs = Math.floor((abs % 60000) / 1000);
  const sign = remaining < 0 ? "просрочка: " : "осталось: ";
  const label = `${sign}${mins}:${secs.toString().padStart(2, "0")}`;
  let textColor = "text-emerald-600";
  let dotColor = "bg-emerald-600";
  if (ratio <= 0.25) { textColor = "text-red-600"; dotColor = "bg-red-600"; }
  else if (ratio <= 0.5) { textColor = "text-orange-500"; dotColor = "bg-orange-500"; }
  if (forceWhite) { textColor = "text-white"; dotColor = "bg-white"; }
  return (
    <div className={cn("flex items-center gap-2 text-sm font-medium", textColor)}>
      <span className={cn("inline-block size-2 rounded-full", dotColor)} />
      <span>{label}</span>
    </div>
  );
}


