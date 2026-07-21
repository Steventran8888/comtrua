"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";

export default function RootPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [needsName, setNeedsName] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [googleBusy, setGoogleBusy] = useState(false);

  // name onboarding state (fallback, in case Google doesn't provide a name)
  const [fullName, setFullName] = useState("");
  const [nameBusy, setNameBusy] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function init() {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      await handleSession(data.session);
      setLoading(false);
    }

    async function handleSession(s: Session | null) {
      setSession(s);
      if (s) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", s.user.id)
          .maybeSingle();
        if (!mounted) return;
        if (profile?.full_name && profile.full_name.trim().length > 0) {
          setNeedsName(false);
          router.replace("/home");
          return;
        }

        // Google (and other OAuth) providers usually give us the full name
        // already — skip the manual entry step when we can use it directly.
        const metaName =
          (s.user.user_metadata?.full_name as string | undefined) ||
          (s.user.user_metadata?.name as string | undefined);
        if (metaName && metaName.trim().length > 0) {
          const { error } = await supabase
            .from("profiles")
            .update({ full_name: metaName.trim(), email: s.user.email })
            .eq("id", s.user.id);
          if (!mounted) return;
          if (!error) {
            setNeedsName(false);
            router.replace("/home");
            return;
          }
        }

        setNeedsName(true);
      } else {
        setNeedsName(false);
      }
    }

    init();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      handleSession(s);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleGoogleSignIn() {
    setAuthError(null);
    setGoogleBusy(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/` },
    });
    if (error) {
      setAuthError("Không thể đăng nhập bằng Google, vui lòng thử lại.");
      setGoogleBusy(false);
    }
    // On success the browser redirects away, so no further state change needed here.
  }

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault();
    if (!session) return;
    if (fullName.trim().length < 2) {
      setNameError("Vui lòng nhập họ tên đầy đủ.");
      return;
    }
    setNameBusy(true);
    setNameError(null);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: fullName.trim(), email: session.user.email })
        .eq("id", session.user.id);
      if (error) throw error;
      router.replace("/home");
    } catch (err: any) {
      setNameError("Có lỗi xảy ra, vui lòng thử lại.");
    } finally {
      setNameBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-pulse text-brand font-medium">Đang tải...</div>
      </div>
    );
  }

  // Logged in, but needs to provide full name (fallback if Google didn't supply one)
  if (session && needsName) {
    return (
      <div className="flex-1 flex flex-col justify-center px-6 py-10">
        <div className="text-center mb-8">
          <div className="text-4xl mb-2">👋</div>
          <h1 className="text-xl font-bold text-brand">Chào mừng bạn!</h1>
          <p className="text-neutral-500 text-sm mt-1">
            Vui lòng nhập họ tên đầy đủ để tiếp tục
          </p>
        </div>
        <form onSubmit={handleSaveName} className="space-y-4">
          <input
            type="text"
            placeholder="Họ và tên"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full border border-neutral-300 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-brand"
            autoFocus
          />
          {nameError && (
            <p className="text-red-600 text-sm text-center">{nameError}</p>
          )}
          <button
            type="submit"
            disabled={nameBusy}
            className="w-full bg-brand text-white font-semibold py-3 rounded-xl disabled:opacity-50"
          >
            {nameBusy ? "Đang lưu..." : "Lưu và tiếp tục"}
          </button>
        </form>
      </div>
    );
  }

  // Not logged in: Google-only sign-in screen
  return (
    <div className="flex-1 flex flex-col justify-center px-6 py-10">
      <div className="text-center mb-10">
        <div className="text-5xl mb-3">🍜</div>
        <h1 className="text-2xl font-bold text-brand">Nét Huế</h1>
        <p className="text-neutral-500 text-sm mt-1">
          Đặt cơm trưa hàng ngày cùng đồng nghiệp
        </p>
      </div>

      <button
        onClick={handleGoogleSignIn}
        disabled={googleBusy}
        className="w-full flex items-center justify-center gap-3 border border-neutral-300 rounded-xl py-3 font-medium text-neutral-700 disabled:opacity-50"
      >
        <GoogleIcon />
        {googleBusy ? "Đang chuyển hướng..." : "Tiếp tục với Google"}
      </button>

      {authError && (
        <p className="text-red-600 text-sm text-center mt-4">{authError}</p>
      )}
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.94v2.33A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.95 10.7A5.4 5.4 0 0 1 3.66 9c0-.59.1-1.17.29-1.7V4.97H.94A9 9 0 0 0 0 9c0 1.45.35 2.83.94 4.03l3.01-2.33Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .94 4.97l3.01 2.33C4.66 5.17 6.65 3.58 9 3.58Z"
      />
    </svg>
  );
}
