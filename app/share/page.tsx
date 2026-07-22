"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { formatCurrency, formatDateVN } from "@/lib/date";
import type { SharedVoucher } from "@/lib/types";

const DENOMINATIONS = [50000, 10000] as const;

export default function SharePage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-pulse text-brand font-medium">
            Đang tải...
          </div>
        </div>
      }
    >
      <ShareContent />
    </Suspense>
  );
}

function ShareContent() {
  const params = useSearchParams();
  const date = params.get("date") || "";

  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [vouchers, setVouchers] = useState<SharedVoucher[] | null>(null);

  async function handleUnlock(e: React.FormEvent) {
    e.preventDefault();
    if (!date || pin.trim().length === 0) return;
    setLoading(true);
    setError(null);
    const { data, error } = await supabase.rpc("get_shared_vouchers", {
      p_date: date,
      p_pin: pin.trim(),
    });
    if (error) {
      setError("Mã PIN không đúng, vui lòng thử lại.");
    } else {
      setVouchers(data || []);
    }
    setLoading(false);
  }

  if (!date) {
    return (
      <div className="flex-1 flex items-center justify-center px-6 text-center">
        <p className="text-neutral-500 text-sm">Đường link không hợp lệ.</p>
      </div>
    );
  }

  if (!vouchers) {
    return (
      <div className="flex-1 flex flex-col justify-center px-6 py-10">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🎟️</div>
          <h1 className="text-2xl font-bold text-brand">Voucher Nét Huế</h1>
          <p className="text-neutral-500 text-sm mt-1">
            Ngày {formatDateVN(date)}
          </p>
        </div>
        <form onSubmit={handleUnlock} className="space-y-3">
          <input
            type="text"
            inputMode="numeric"
            required
            placeholder="Nhập mã PIN"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            className="w-full border border-neutral-300 rounded-xl px-4 py-3 text-base text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-brand"
          />
          {error && (
            <p className="text-red-600 text-sm text-center">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand text-white font-semibold py-3 rounded-xl disabled:opacity-50"
          >
            {loading ? "Đang kiểm tra..." : "Xem voucher"}
          </button>
        </form>
      </div>
    );
  }

  const total = vouchers.reduce((s, v) => s + Number(v.denomination), 0);
  const byDenomination = new Map<number, SharedVoucher[]>();
  for (const d of DENOMINATIONS) byDenomination.set(d, []);
  for (const v of vouchers) {
    const list = byDenomination.get(Number(v.denomination));
    if (list) list.push(v);
    else byDenomination.set(Number(v.denomination), [v]);
  }

  return (
    <div className="flex-1 flex flex-col">
      <header className="bg-white border-b border-neutral-200 px-4 py-3">
        <h1 className="font-semibold text-neutral-800">Voucher Nét Huế</h1>
        <p className="text-xs text-neutral-400">Ngày {formatDateVN(date)}</p>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {vouchers.length === 0 ? (
          <p className="text-neutral-400 text-sm text-center py-10">
            Chưa có voucher nào trong ngày này.
          </p>
        ) : (
          <>
            <div className="flex justify-between items-center px-4 py-3 bg-neutral-50 rounded-2xl font-semibold mb-4">
              <span>Tổng tiền voucher</span>
              <span className="text-brand">{formatCurrency(total)}</span>
            </div>

            <div className="space-y-3">
              {DENOMINATIONS.map((d) => {
                const list = byDenomination.get(d) || [];
                if (list.length === 0) return null;
                return (
                  <div key={d}>
                    <h2 className="font-medium text-neutral-700 mb-2 text-sm">
                      Voucher {formatCurrency(d)} ({list.length} phiếu)
                    </h2>
                    <div className="grid grid-cols-3 gap-2">
                      {list.map((v) => (
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
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
