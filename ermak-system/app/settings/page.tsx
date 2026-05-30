"use client";
import { useEffect, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

type Settings = {
  brandName: string; slogan: string; logoUrl: string;
  homeTitle: string; homeSubtitle: string; promoTitle: string; promoSubtitle: string;
  phone: string; address: string; primaryColor: string; secondaryColor: string;
};

const FIELDS: Array<{ key: keyof Settings; label: string; type?: string }> = [
  { key: "brandName", label: "Название бренда" },
  { key: "slogan", label: "Слоган" },
  { key: "logoUrl", label: "URL логотипа (например /logo.png)" },
  { key: "homeTitle", label: "Заголовок на главной (PWA)" },
  { key: "homeSubtitle", label: "Подзаголовок на главной (PWA)" },
  { key: "promoTitle", label: "Заголовок раздела «Акции»" },
  { key: "promoSubtitle", label: "Подзаголовок раздела «Акции»" },
  { key: "phone", label: "Телефон" },
  { key: "address", label: "Адрес" },
  { key: "primaryColor", label: "Основной цвет", type: "color" },
  { key: "secondaryColor", label: "Дополнительный цвет", type: "color" },
];

export default function SettingsPage() {
  const settings = useQuery(api.settings.get);
  const vapid = useQuery(api.customer.getVapidPublicKey);
  const update = useMutation(api.settings.update);
  const [form, setForm] = useState<Settings | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (settings && !form) setForm(settings as Settings);
  }, [settings, form]);

  if (!form) return <div className="p-6 text-gray-500">Загрузка…</div>;

  return (
    <div className="space-y-6 max-w-3xl mt-5 mx-auto">
      <Card>
        <CardHeader className="bg-zinc-800 text-white">
          <CardTitle className="text-xl">Настройки сайта и брендинга</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <div className="flex items-center gap-4">
            <img src={form.logoUrl || "/logo.png"} alt="logo" className="w-16 h-16 object-contain rounded border" />
            <div className="text-sm text-gray-600">Текущий логотип. Загрузите файл в <code>public/</code> и укажите путь, например <code>/logo.png</code>.</div>
          </div>
          {FIELDS.map((f) => (
            <div key={f.key} className="flex flex-col gap-1">
              <label className="text-sm text-gray-600">{f.label}</label>
              {f.type === "color" ? (
                <div className="flex items-center gap-2">
                  <input type="color" value={form[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} className="h-9 w-14 border rounded" />
                  <Input value={form[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} className="w-40" />
                </div>
              ) : (
                <Input value={form[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
              )}
            </div>
          ))}
          <div className="flex items-center gap-3">
            <Button onClick={async () => { await update(form as any); setSaved(true); toast.success("Настройки сохранены"); setTimeout(() => setSaved(false), 2000); }}>Сохранить</Button>
            {saved && <span className="text-sm text-green-600">Сохранено</span>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="bg-zinc-800 text-white">
          <CardTitle className="text-xl">Ключи и доступы</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-4 text-sm">
          <div>
            <div className="font-medium">Admin key (Convex self-hosted)</div>
            <p className="text-gray-600">Генерируется при запуске и сохраняется в файле <code>.env</code> в корне проекта (переменная <code>CONVEX_SELF_HOSTED_ADMIN_KEY</code>). Также его печатает команда <code>make keys</code>. Используется дашбордом Convex на <code>http://localhost:6791</code>.</p>
          </div>
          <div>
            <div className="font-medium">VAPID — публичный ключ Web Push</div>
            <pre className="bg-gray-100 p-2 rounded overflow-x-auto break-all whitespace-pre-wrap">{vapid || "не задан (запустите деплой)"}</pre>
            <p className="text-gray-600">Приватный VAPID-ключ хранится в переменных окружения деплоймента Convex (<code>VAPID_PRIVATE_KEY</code>) и виден в дашборде Convex → Settings → Environment Variables, либо через <code>make keys</code>.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
