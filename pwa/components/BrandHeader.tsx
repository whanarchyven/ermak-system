"use client";

import Image from "next/image";
import { useSiteSettings } from "@/lib/useSiteSettings";

export default function BrandHeader({ title, subtitle }: { title?: string; subtitle?: string }) {
  const settings = useSiteSettings();
  return (
    <header className="px-4 pb-6 pt-6 mt-6 text-[var(--bk-brown)] md:rounded-3xl">
      <div className="mx-auto w-full max-w-5xl">
        {/* <div className="flex items-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-white">
            <Image src={settings.logoUrl || "/logo.png"} alt={settings.brandName} width={40} height={40} className="object-contain" />
          </span>
          <span className="text-xl font-black tracking-tight">{settings.brandName?.toUpperCase()}</span>
          <span className="text-sm font-medium text-white/70">· {settings.slogan}</span>
        </div> */}
        <h1 className="mt-4 text-2xl font-black leading-tight md:text-4xl">{title ?? settings.homeTitle}</h1>
        {(subtitle ?? settings.homeSubtitle) && <p className="mt-1 text-sm text-white/85 md:text-base">{subtitle ?? settings.homeSubtitle}</p>}
      </div>
    </header>
  );
}
