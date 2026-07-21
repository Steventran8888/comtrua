"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function HomePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState<string>("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.replace("/");
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", data.session.user.id)
        .maybeSingle();
      if (!mounted) return;
      setFullName(profile?.full_name || "");
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [router]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/");
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-pulse text-brand font-medium">Đang tải...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col px-6 py-8">
      <div className="text-center mb-8">
        <div className="text-4xl mb-2">🍜</div>
        <h1 className="text-xl font-bold text-brand">Nét Huế</h1>
        <p className="text-neutral-500 text-sm mt-1">
          Xin chào, <span className="font-semibold text-neutral-700">{fullName}</span>
        </p>
      </div>

      <div className="flex-1 flex flex-col gap-4 justify-center">
        <HomeButton
          emoji="🍽️"
          title="Chọn món"
          subtitle="Xem thực đơn và chọn món hôm nay"
          onClick={() => router.push("/order")}
        />
        <HomeButton
          emoji="🧾"
          title="Gửi voucher"
          subtitle="Tải ảnh hoá đơn/voucher lên"
          onClick={() => router.push("/voucher")}
        />
        <HomeButton
          emoji="📋"
          title="Xem đồ đặt hôm nay"
          subtitle="Danh sách món của cả nhóm theo ngày"
          onClick={() => router.push("/orders")}
        />
      </div>

      <button
        onClick={handleLogout}
        className="mt-8 text-center text-sm text-neutral-400 underline"
      >
        Đăng xuất
      </button>
    </div>
  );
}

function HomeButton({
  emoji,
  title,
  subtitle,
  onClick,
}: {
  emoji: string;
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-4 bg-white border border-neutral-200 rounded-2xl px-5 py-4 shadow-sm active:scale-[0.98] transition"
    >
      <div className="text-3xl">{emoji}</div>
      <div className="text-left flex-1">
        <div className="font-semibold text-neutral-800">{title}</div>
        <div className="text-xs text-neutral-500">{subtitle}</div>
      </div>
      <div className="text-neutral-300">›</div>
    </button>
  );
}
