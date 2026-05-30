"use client";

// Картинка блюда с приятным плейсхолдером, если фото нет.
export default function FoodThumb({
  src,
  alt,
  className,
}: {
  src?: string;
  alt: string;
  className?: string;
}) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} className={className ?? "h-full w-full object-cover"} />;
  }
  return (
    <div
      className={
        (className ?? "h-full w-full") +
        " flex items-center justify-center bg-gradient-to-br from-[var(--bk-orange)] to-[var(--bk-red)] text-2xl"
      }
    >
      🍔
    </div>
  );
}
