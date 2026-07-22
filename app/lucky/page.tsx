"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { todayVN } from "@/lib/date";
import type { LuckyDraw } from "@/lib/types";

interface Candidate {
  user_id: string;
  user_name: string;
}

export default function LuckyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [checkedAuth, setCheckedAuth] = useState(false);
  const [candidateCount, setCandidateCount] = useState(0);
  const [todayDraw, setTodayDraw] = useState<LuckyDraw | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      const today = todayVN();
      const [{ data: orderRows }, { data: drawRow }] = await Promise.all([
        supabase
          .from("order_items")
          .select("user_id, user_name")
          .eq("order_date", today),
        supabase
          .from("lucky_draws")
          .select("*")
          .eq("draw_date", today)
          .maybeSingle(),
      ]);
      if (!mounted) return;
      const uniqueIds = new Set((orderRows || []).map((r) => r.user_id));
      setCandidateCount(uniqueIds.size);
      setTodayDraw(drawRow || null);
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [checkedAuth]);

  async function handleDraw() {
    setError(null);
    setDrawing(true);
    try {
      const today = todayVN();

      const { data: orderRows } = await supabase
        .from("order_items")
        .select("user_id, user_name")
        .eq("order_date", today);

      const candidateMap = new Map<string, Candidate>();
      for (const r of orderRows || []) {
        candidateMap.set(r.user_id, { user_id: r.user_id, user_name: r.user_name });
      }

      const { data: prevDraw } = await supabase
        .from("lucky_draws")
        .select("*")
        .lt("draw_date", today)
        .order("draw_date", { ascending: false })
        .limit(1)
        .maybeSingle();

      const excludedIds = new Set(prevDraw?.winner_ids || []);
      const pool = Array.from(candidateMap.values()).filter(
        (c) => !excludedIds.has(c.user_id)
      );

      if (pool.length < 2) {
        setError(
          "Không đủ người để quay số (cần ít nhất 2 người, sau khi loại người đã trúng hôm trước)."
        );
        return;
      }

      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      const winners = pool.slice(0, 2);

      const { data: inserted, error: insErr } = await supabase
        .from("lucky_draws")
        .insert({
          draw_date: today,
          winner_ids: winners.map((w) => w.user_id),
          winner_names: winners.map((w) => w.user_name),
        })
        .select()
        .single();

      if (insErr) {
        const { data: existing } = await supabase
          .from("lucky_draws")
          .select("*")
          .eq("draw_date", today)
          .maybeSingle();
        if (existing) setTodayDraw(existing);
        else throw insErr;
      } else {
        setTodayDraw(inserted);
      }
    } catch (err: any) {
      setError("Có lỗi khi quay số, vui lòng thử lại.");
    } finally {
      setDrawing(false);
    }
  }

  if (!checkedAuth || loading) {
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
          <h1 className="font-semibold text-neutral-800">Người may mắn</h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pt-24 pb-10 flex flex-col items-center">
        <p className="text-neutral-500 text-sm text-center mb-6">
          {candidateCount} người đã đặt đồ hôm nay
        </p>

        {todayDraw ? (
          <div className="w-full text-center">
            <div className="text-5xl mb-4">🍀🎉</div>
            <p className="text-neutral-500 text-sm mb-4">
              Kết quả hôm nay
            </p>
            <div className="space-y-3">
              {todayDraw.winner_names.map((name) => (
                <div
                  key={name}
                  className="bg-white border border-brand/30 rounded-2xl px-6 py-4 shadow-sm"
                >
                  <span className="text-lg font-bold text-brand">{name}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="w-full text-center">
            <div className="text-5xl mb-6">🍀</div>
            {error && (
              <p className="text-red-600 text-sm text-center mb-4">{error}</p>
            )}
            <button
              onClick={handleDraw}
              disabled={drawing}
              className="w-full bg-brand text-white font-semibold py-3 rounded-xl disabled:opacity-50"
            >
              {drawing ? "Đang quay số..." : "Quay số may mắn"}
            </button>
            <p className="text-xs text-neutral-400 mt-3">
              Người đã trúng hôm trước sẽ được loại khỏi lượt quay hôm nay.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
