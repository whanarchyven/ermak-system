"use client";

import { ReactNode } from "react";
import BottomNav from "@/components/BottomNav";
import TopBar from "@/components/TopBar";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";

export default function AppChrome({ children }: { children: ReactNode }) {
  return (
    <>
      <ServiceWorkerRegister />
      <TopBar />
      <main className="mx-auto w-full max-w-md pb-24 md:max-w-6xl md:pb-10">{children}</main>
      <div className="md:hidden">
        <BottomNav />
      </div>
    </>
  );
}
