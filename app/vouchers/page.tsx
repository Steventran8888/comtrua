"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { formatCurrency, formatDateVN, todayVN } from "@/lib/date";
import type { Voucher } from "@/lib/types";

const DENOMINATIONS = [50000, 10000] as const;

function generatePin(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export default function VouchersPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [checkedAuth, setCheckedAuth] = useState(false);
  const [date, setDate] = useState(todayVN());
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const [sharing, setSharing] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const [shareResult, setShareResult] = useState<{
    link: string;
    pin: string;
  } | null>(null);

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
      const { data } = await supabase
        .from("vouchers")
        .select("*")
        .eq("voucher_date", date)
        .order("created_at", { ascending: false });
      if (!mounted) return;
      setVouchers(data || []);
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [date, checkedAuth]);

  const byDenomination = useMemo(() => {
    const map = new Map<number, Voucher[]>();
    for (const d of DENOMINATIONS) map.set(d, []);
    for (const v of vouchers) {
      const list = map.get(Number(v.denomination));
      if (list) list.push(v);
      else map.set(Number(v.denomination), [v]);
    }
    return map;
  }, [vouchers]);

  const total = vouchers.reduce((s, v) => s + Number(v.denomination), 0);

  function toggle(d: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(d)) next.delete(d);
      else next.add(d);
      return next;
    });
  }

  async function handleShare() {
    setShareError(null);
    setSharing(true);
    try {
      let pin: string | undefined;

      const { data: existing } = await supabase
        .from("voucher_share_pins")
        .select("pin")
        .eq("voucher_date", date)
        .maybeSingle();

      pin = existing?.pin;

      if (!pin) {
        pin = generatePin();
        const { error: insErr } = await supabase
          .from("voucher_share_pins")
          .insert({ voucher_date: date, pin });
        if (insErr) {
          const { data: retry } = await supabase
            .from("voucher_share_pins")
            .select("pin")
            .eq("voucher_date", date)
            .maybeSingle();
          if (retry?.pin) pin = retry.pin;
          else throw insErr;
        }
      }

      if (!pin) throw new Error("Không tạo được mã PIN.");
      const finalPin = pin;

      const link = `${window.location.origin}/share?date=${date}`;
      const text = `Voucher ngày ${formatDateVN(date)}: ${link}\nMã PIN: ${finalPin}`;
      await navigator.clipboard.writeText(text);
      setShareResult({ link, pin: finalPin });
    } catch (err: any) {
      setShareError("Không thể tạo link chia sẻ, vui lòng thử lại.");
    } finally {
      setSharing(false);
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
          <h1 className="font-semibold text-neutral-800 flex-1">Voucher</h1>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="text-sm border border-neutral-300 rounded-lg px-2 py-1"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-20 pb-8">
        {loading ? (
          <div className="animate-pulse text-brand font-medium text-center py-10">
            Đang tải...
          </div>
        ) : vouchers.length === 0 ? (
          <p className="text-neutral-400 text-sm text-center py-10">
            Chưa có voucher nào trong ngày này.
          </p>
        ) : (
          <>
            <div className="flex justify-between items-center px-4 py-3 bg-neutral-50 rounded-2xl font-semibold mb-4">
              <span>Tổng tiền voucher</span>
              <span className="text-brand">{formatCurrency(total)}</span>
            </div>

            <div className="space-y-3 mb-5">
              {DENOMINATIONS.map((d) => {
                const list = byDenomination.get(d) || [];
                const isOpen = expanded.has(d);
                return (
                  <div
                    key={d}
                    className="border border-neutral-200 rounded-2xl overflow-hidden"
                  >
                    <button
                      onClick={() => toggle(d)}
                      className="w-full flex items-center justify-between px-4 py-3 bg-neutral-50"
                    >
                      <span className="font-medium text-neutral-800">
                        Voucher {formatCurrency(d)}{" "}
                        <span className="text-xs text-neutral-400">
                          ({list.length} phiếu)
                        </span>
                      </span>
                      <span
                        className={`text-neutral-400 transition-transform ${
                          isOpen ? "rotate-180" : ""
                        }`}
                      >
                        ⌄
                      </span>
                    </button>
                    {isOpen && (
                      <div className="p-3">
                        {list.length === 0 ? (
                          <p className="text-neutral-400 text-sm px-1 py-2">
                            Chưa có phiếu nào.
                          </p>
                        ) : (
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
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {shareError && (
              <p className="text-red-600 text-xs text-center mb-2">
                {shareError}
              </p>
            )}
            <button
              onClick={handleShare}
              disabled={sharing}
              className="w-full bg-brand text-white font-semibold py-3 rounded-xl disabled:opacity-50"
            >
              {sharing ? "Đang tạo link..." : "Gửi voucher cho nhà hàng"}
            </button>
          </>
        )}
      </div>

      {shareResult && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-20 px-6">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 text-center">
            <div className="text-4xl mb-2">✅</div>
            <h2 className="font-bold text-lg text-neutral-800 mb-1">
              Copy thông tin thành công!
            </h2>
            <p className="text-sm text-neutral-500 mb-4">
              Dán (paste) và gửi cho nhà hàng qua Zalo/Messenger.
            </p>
            <div className="bg-neutral-50 rounded-xl px-4 py-3 text-left text-sm text-neutral-700 mb-4 break-all">
              <p className="mb-1">{shareResult.link}</p>
              <p>
                Mã PIN: <span className="font-semibold">{shareResult.pin}</span>
              </p>
            </div>
            <button
              onClick={() => setShareResult(null)}
              className="w-full bg-brand text-white font-semibold py-3 rounded-xl"
            >
              Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
