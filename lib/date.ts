// Helpers to keep "today" consistent with Asia/Ho_Chi_Minh timezone,
// matching the default used by the database (order_date / voucher_date columns).

export function todayVN(): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(new Date()); // yields YYYY-MM-DD
}

export function formatDateVN(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

export function formatCurrency(amount: number): string {
  return amount.toLocaleString("vi-VN") + " đ";
}
