export function rub(n: number | undefined | null): string {
  const v = Math.round((n ?? 0) as number);
  return `${v.toLocaleString("ru-RU")} ₽`;
}

export const ORDER_STATUS_LABEL: Record<string, string> = {
  backlog: "Оформлен",
  accepted: "Принят",
  pending: "Готовится",
  ready: "Готов к выдаче",
  delivery: "Передан в доставку",
  delivery_pending: "Курьер в пути",
  completed: "Завершён",
  cancelled: "Отменён",
  refund: "Возврат",
};

export const ORDER_TYPE_LABEL: Record<string, string> = {
  delivery: "Доставка",
  "self-service": "Самовывоз",
  restaurant: "В ресторане",
};
