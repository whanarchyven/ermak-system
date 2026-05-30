import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "sonner";
import ConvexClientProvider from "@/components/ConvexClientProvider";
import AppChrome from "@/components/AppChrome";

export const metadata: Metadata = {
  title: "Ермак — доставка и самовывоз",
  description: "Меню, заказы, акции и баллы кафе «Ермак»",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Ермак",
  },
  icons: {
    icon: "/icons/icon.svg",
    apple: "/icons/icon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#371B03",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className="min-h-screen antialiased">
        <ConvexClientProvider>
          <AppChrome>{children}</AppChrome>
          <Toaster position="top-center" richColors closeButton toastOptions={{ style: { fontWeight: 600 } }} />
        </ConvexClientProvider>
      </body>
    </html>
  );
}
