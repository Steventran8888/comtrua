"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { formatCurrency, todayVN } from "@/lib/date";
import type { OrderItem, Voucher } from "@/lib/types";

export default function OrdersPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [checkedAuth, setCheckedAuth] = useState(false);
  const [date, setDate] = useState(todayVN());
  const [items, setItems] = useState<OrderItem[]>([]);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.replace("/");
        return;
      }
      setCheckedAuth(true);
    })();
  }, [router]);

  useEffect(() => {
    if (!checkedAuth) return;
    let mounted = true;
    (async () => {
      setLoading(true);
      const [{ data: orderRows }, { data: voucherRows }] = await Promise.all([
        supabase
          .from("order_items")
          .select("*")
          .eq("order_date", date)
          .order("user_name", { ascending: true })
          .order("created_at", { ascending: true }),
        supabase
          .from("vouchers")
          .select("*")
          .eq("voucher_date", date)
          .order("created_at", { ascending: false }),
      ]);
      if (!mounted) return;
      setItems(orderRows || []);
      setVouchers(voucherRows || []);
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [date, checkedAuth]);

  const grouped = useMemo(() => {
    const map = new Map<string, OrderItem[]>();
    for (const it of items) {
      if (!map.has(it.user_name)) map.set(it.user_name, []);
      map.get(it.user_name)!.push(it);
    }
    return Array.from(map.entries());
  }, [items]);

  const grandTotal = items.reduce((s, it) => s + Number(it.price), 0);

  if (!checkedAuth) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-pulse text-brand font-medium">Đang tải...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      <header className="sticky top-0 bg-white border-b border-neutral-200 px-4 py-3 flex items-center gap-3 z-10">
        <button onClick={() => router.push("/home")} className="text-xl">
          ‹
        </button>
        <h1 className="font-semibold text-neutral-800 flex-1">
          Đồ đặt trong ngày
        </h1>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="text-sm border border-neutral-300 rounded-lg px-2 py-1"
        />
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {loading ? (
          <div className="animate-pulse text-brand font-medium text-center py-10">
            Đang tải...
          </div>
        ) : grouped.length === 0 ? (
          <p className="text-neutral-400 text-sm text-center py-10">
            Chưa có ai đặt món trong ngày này.
          </p>
        ) : (
          <div className="space-y-3">
            {grouped.map(([name, rows]) => {
              const subtotal = rows.reduce((s, r) => s + Number(r.price), 0);
              return (
                <div
                  key={name}
                  className="border border-neutral-200 rounded-2xl px-4 py-3"
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-neutral-800">
                      {name}
                    </span>
                    <span className="text-sm font-medium text-brand">
                      {formatCurrency(subtotal)}
                    </span>
                  </div>
                  <ul className="text-sm text-neutral-600 space-y-1">
                    {rows.map((r) => (
                      <li key={r.id} className="flex justify-between">
                        <span>{r.dish_name}</span>
                        <span>{formatCurrency(Number(r.price))}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}

            <div className="flex justify-between items-center px-4 py-3 bg-neutral-50 rounded-2xl font-semibold">
              <span>Tổng cộng</span>
              <span className="text-brand">{formatCurrency(grandTotal)}</span>
            </div>
          </div>
        )}

        <h2 className="font-medium text-neutral-700 mt-6 mb-2 text-sm">
          Voucher đã gửi ({vouchers.length})
        </h2>
        {vouchers.length === 0 ? (
          <p className="text-neutral-400 text-sm">Chưa có voucher nào.</p>
        ) : (
          <div className="grid grid-cols-3 gap-2 mb-4">
            {vouchers.map((v) => (
              <a
                key={v.id}
                href={v.image_url}
                target="_blank"
                rel="noreferrer"
                className="block"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={v.image_url}
                  alt={v.user_name}
                  className="w-full aspect-square object-cover rounded-lg border border-neutral-200"
                />
                <p className="text-[10px] text-neutral-500 truncate mt-1">
                  {v.user_name}
                </p>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
