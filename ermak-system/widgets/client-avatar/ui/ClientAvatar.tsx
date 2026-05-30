import Image from "next/image";

export function ClientAvatar() {
    const clientName="Кафе Ермак"
  return (
    <div className="flex items-center gap-4">
          <div className="relative w-10 h-10">
            <Image src="/images/logo.jpg" alt="Logo" fill className="object-cover" />
          </div>
          <p className="text-2xl font-bold">{`${clientName}`}</p>
        </div>
  );
}