"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { formatCurrency, formatDateVN, todayVN } from "@/lib/date";
import type { OrderItem, Voucher } from "@/lib/types";

export default function OrdersPage() {
  const router = useRouter();
  const summaryRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [checkedAuth, setCheckedAuth] = useState(false);
  const [date, setDate] = useState(todayVN());
  const [items, setItems] = useState<OrderItem[]>([]);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [capturing, setCapturing] = useState(false);
  const [captureError, setCaptureError] = useState<string | null>(null);

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

  const dishSummary = useMemo(() => {
    const map = new Map<string, { name: string; qty: number; subtotal: number }>();
    for (const it of items) {
      const cur = map.get(it.dish_name) || {
        name: it.dish_name,
        qty: 0,
        subtotal: 0,
      };
      cur.qty += 1;
      cur.subtotal += Number(it.price);
      map.set(it.dish_name, cur);
    }
    return Array.from(map.values()).sort((a, b) => b.qty - a.qty);
  }, [items]);

  const grandTotal = items.reduce((s, it) => s + Number(it.price), 0);
  const voucherTotal = vouchers.reduce((s, v) => s + Number(v.denomination), 0);
  const voucherCovered = grandTotal > 0 && voucherTotal >= grandTotal;

  async function handleCapture() {
    if (!summaryRef.current) return;
    setCaptureError(null);
    setCapturing(true);
    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(summaryRef.current, {
        backgroundColor: "#ffffff",
        pixelRatio: 2,
      });
      const fileName = `tong-hop-mon-${date}.png`;
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], fileName, { type: "image/png" });

      if (
        typeof navigator.share === "function" &&
        navigator.canShare?.({ files: [file] })
      ) {
        await navigator.share({ files: [file], title: "Tổng hợp món ăn" });
      } else {
        const link = document.createElement("a");
        link.href = dataUrl;
        link.download = fileName;
        link.click();
      }
    } catch (err: any) {
      if (err?.name !== "AbortError") {
        setCaptureError("Không thể tạo ảnh, vui lòng thử lại.");
      }
    } finally {
      setCapturing(false);
    }
  }

  if (!checkedAuth) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-pulse text-brand font-medium">Đang tải...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      <div className="fixed top-0 left-0 right-0 z-10">
        <div className="max-w-md mx-auto bg-white border-b border-neutral-200 px-4 py-3 flex items-center gap-3">
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
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-20 pb-4">
        {loading ? (
          <div className="animate-pulse text-brand font-medium text-center py-10">
            Đang tải...
          </div>
        ) : grouped.length === 0 ? (
          <p className="text-neutral-400 text-sm text-center py-10">
            Chưa có ai đặt món trong ngày này.
          </p>
        ) : (
          <>
            <h2 className="font-medium text-neutral-700 mb-2 text-sm">
              Tổng hợp món ăn ({dishSummary.length})
            </h2>
            <div
              ref={summaryRef}
              className="bg-white border border-neutral-200 rounded-2xl overflow-hidden mb-2"
            >
              <div className="flex items-center justify-between px-4 py-2 bg-neutral-50 border-b border-neutral-200">
                <span className="text-xs font-medium text-neutral-500">
                  Nét Huế
                </span>
                <span className="text-xs text-neutral-400">
                  {formatDateVN(date)}
                </span>
              </div>
              <div className="divide-y divide-neutral-100">
                {dishSummary.map((d) => (
                  <div
                    key={d.name}
                    className="flex items-center justify-between px-4 py-2.5 text-sm"
                  >
                    <span className="text-neutral-800">
                      {d.name}{" "}
                      <span className="text-brand font-semibold">x{d.qty}</span>
                    </span>
                    <span className="font-medium text-neutral-600">
                      {formatCurrency(d.subtotal)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center px-4 py-3 bg-neutral-50 border-t border-neutral-200 font-semibold">
                <span>Tổng tiền</span>
                <span className="text-brand">{formatCurrency(grandTotal)}</span>
              </div>
            </div>

            <button
              onClick={handleCapture}
              disabled={capturing}
              className="w-full mb-5 flex items-center justify-center gap-2 border border-neutral-300 rounded-xl py-2.5 text-sm font-medium text-neutral-700 disabled:opacity-50"
            >
              📸 {capturing ? "Đang tạo ảnh..." : "Chụp ảnh gửi nhà hàng"}
            </button>
            {captureError && (
              <p className="text-red-600 text-xs text-center -mt-4 mb-4">
                {captureError}
              </p>
            )}

            <h2 className="font-medium text-neutral-700 mb-2 text-sm">
              Chi tiết theo người ({grouped.length})
            </h2>
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
          </>
        )}

        <div className="flex items-center justify-between mt-6 mb-2">
          <h2 className="font-medium text-neutral-700 text-sm">
            Voucher đã gửi ({vouchers.length})
          </h2>
          {vouchers.length > 0 && (
            <span className="text-sm font-semibold text-brand">
              {formatCurrency(voucherTotal)}
            </span>
          )}
        </div>

        {grandTotal > 0 && (
          <div
            className={`flex justify-between items-center px-4 py-3 rounded-2xl font-semibold mb-3 ${
              voucherCovered
                ? "bg-green-50 text-green-700"
                : "bg-amber-50 text-amber-700"
            }`}
          >
            <span>
              {voucherCovered
                ? "✅ Voucher đã đủ"
                : `⚠️ Còn thiếu ${formatCurrency(grandTotal - voucherTotal)}`}
            </span>
            <span>
              {formatCurrency(voucherTotal)} / {formatCurrency(grandTotal)}
            </span>
          </div>
        )}

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
                className="block relative"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={v.image_url}
                  alt={v.user_name}
                  className="w-full aspect-square object-cover rounded-lg border border-neutral-200"
                />
                <span className="absolute top-1 right-1 bg-black/60 text-white text-[10px] font-medium px-1.5 py-0.5 rounded">
                  {v.denomination / 1000}k
                </span>
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
