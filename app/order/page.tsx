"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import { formatCurrency } from "@/lib/date";
import type { Dish, DishCategory } from "@/lib/types";

export default function OrderPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [fullName, setFullName] = useState("");

  const [categories, setCategories] = useState<DishCategory[]>([]);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [selected, setSelected] = useState<Map<number, Dish>>(new Map());

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastOrderDishes, setLastOrderDishes] = useState<Dish[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        router.replace("/");
        return;
      }
      const u = sessionData.session.user;
      setUser(u);

      const [{ data: profile }, { data: cats }, { data: dishRows }] =
        await Promise.all([
          supabase.from("profiles").select("full_name").eq("id", u.id).maybeSingle(),
          supabase
            .from("dish_categories")
            .select("*")
            .order("sort_order", { ascending: true }),
          supabase.from("dishes").select("*").order("sort_order", { ascending: true }),
        ]);

      if (!mounted) return;
      setFullName(profile?.full_name || "");
      setCategories(cats || []);
      setDishes(dishRows || []);
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [router]);

  const dishesByCategory = useMemo(() => {
    const map = new Map<number, Dish[]>();
    for (const d of dishes) {
      if (!map.has(d.category_id)) map.set(d.category_id, []);
      map.get(d.category_id)!.push(d);
    }
    return map;
  }, [dishes]);

  function toggleCategory(id: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleDish(d: Dish) {
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(d.id)) next.delete(d.id);
      else next.set(d.id, d);
      return next;
    });
  }

  const selectedList = Array.from(selected.values());
  const totalPrice = selectedList.reduce((s, d) => s + Number(d.price), 0);

  async function handleSubmitOrder() {
    if (!user || selectedList.length === 0) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const rows = selectedList.map((d) => ({
        user_id: user.id,
        user_name: fullName,
        dish_id: d.id,
        dish_name: d.name,
        price: d.price,
      }));
      const { error } = await supabase.from("order_items").insert(rows);
      if (error) throw error;
      setLastOrderDishes(selectedList);
      setSelected(new Map());
      setShowSuccess(true);
    } catch (err: any) {
      setSubmitError("Có lỗi khi lưu món, vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-pulse text-brand font-medium">Đang tải thực đơn...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      <header className="sticky top-0 bg-white border-b border-neutral-200 px-4 py-3 flex items-center gap-3 z-10">
        <button onClick={() => router.push("/home")} className="text-xl">
          ‹
        </button>
        <h1 className="font-semibold text-neutral-800">Chọn món hôm nay</h1>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-3 pb-32">
        {categories.map((cat) => {
          const catDishes = dishesByCategory.get(cat.id) || [];
          const isOpen = expanded.has(cat.id);
          return (
            <div
              key={cat.id}
              className="mb-3 border border-neutral-200 rounded-2xl overflow-hidden"
            >
              <button
                onClick={() => toggleCategory(cat.id)}
                className="w-full flex items-center justify-between px-4 py-3 bg-neutral-50"
              >
                <span className="font-medium text-neutral-800">
                  {cat.name}{" "}
                  <span className="text-xs text-neutral-400">
                    ({catDishes.length} món)
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
                <div className="divide-y divide-neutral-100">
                  {catDishes.map((d) => {
                    const isSelected = selected.has(d.id);
                    return (
                      <button
                        key={d.id}
                        onClick={() => toggleDish(d)}
                        className={`w-full flex items-center justify-between px-4 py-3 text-left transition ${
                          isSelected ? "bg-brand/5" : "bg-white"
                        }`}
                      >
                        <span className="flex items-center gap-3">
                          <span
                            className={`w-5 h-5 rounded-md border flex items-center justify-center text-xs ${
                              isSelected
                                ? "bg-brand border-brand text-white"
                                : "border-neutral-300"
                            }`}
                          >
                            {isSelected ? "✓" : ""}
                          </span>
                          <span className="text-sm text-neutral-800">
                            {d.name}
                            {d.note && (
                              <span className="text-xs text-amber-600 ml-1">
                                ({d.note})
                              </span>
                            )}
                          </span>
                        </span>
                        <span className="text-sm font-medium text-brand whitespace-nowrap">
                          {formatCurrency(Number(d.price))}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="fixed bottom-0 left-0 right-0">
        <div className="max-w-md mx-auto bg-white border-t border-neutral-200 px-4 py-3 safe-bottom">
          <div className="flex items-center justify-between mb-2 text-sm">
            <span className="text-neutral-600">
              Đã chọn: <b>{selectedList.length}</b> món
            </span>
            <span className="font-semibold text-brand">
              Tổng: {formatCurrency(totalPrice)}
            </span>
          </div>
          {submitError && (
            <p className="text-red-600 text-xs mb-2 text-center">{submitError}</p>
          )}
          <button
            disabled={selectedList.length === 0 || submitting}
            onClick={handleSubmitOrder}
            className="w-full bg-brand text-white font-semibold py-3 rounded-xl disabled:opacity-30 disabled:bg-neutral-400"
          >
            {submitting ? "Đang lưu..." : "Chọn món"}
          </button>
        </div>
      </div>

      {showSuccess && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-20 px-6">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 text-center">
            <div className="text-4xl mb-2">🎉</div>
            <h2 className="font-bold text-lg text-neutral-800 mb-1">
              Chọn món thành công!
            </h2>
            <ul className="text-sm text-neutral-600 mb-4 mt-3 text-left max-h-40 overflow-y-auto">
              {lastOrderDishes.map((d) => (
                <li key={d.id} className="flex justify-between py-1">
                  <span>{d.name}</span>
                  <span className="text-brand">{formatCurrency(Number(d.price))}</span>
                </li>
              ))}
            </ul>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => setShowSuccess(false)}
                className="w-full bg-brand text-white font-semibold py-3 rounded-xl"
              >
                Chọn thêm món
              </button>
              <button
                onClick={() => router.push("/voucher")}
                className="w-full bg-neutral-100 text-neutral-700 font-semibold py-3 rounded-xl"
              >
                Gửi voucher
              </button>
              <button
                onClick={() => router.push("/orders")}
                className="w-full bg-neutral-100 text-neutral-700 font-semibold py-3 rounded-xl"
              >
                Xem list đặt đồ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
