"use client";

import { useQuery } from "convex/react";
import { api } from "@/lib/convexApi";

export type SiteSettings = {
  brandName: string;
  slogan: string;
  logoUrl: string;
  homeTitle: string;
  homeSubtitle: string;
  promoTitle: string;
  promoSubtitle: string;
  phone: string;
  address: string;
  primaryColor: string;
  secondaryColor: string;
};

const FALLBACK: SiteSettings = {
  brandName: "Ермак",
  slogan: "Домашнее кафе",
  logoUrl: "/logo.png",
  homeTitle: "Голоден? Мы рядом",
  homeSubtitle: "Собери свой заказ и получи баллами кэшбэк",
  promoTitle: "Акции и промокоды",
  promoSubtitle: "Лови выгоду",
  phone: "",
  address: "",
  primaryColor: "#371B03",
  secondaryColor: "#F8F5EC",
};

export function useSiteSettings(): SiteSettings {
  const s = useQuery(api.settings.get, {});
  return (s as SiteSettings) ?? FALLBACK;
}
