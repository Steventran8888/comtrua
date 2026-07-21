"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";

type Mode = "signin" | "signup";

export default function RootPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [needsName, setNeedsName] = useState(false);

  // auth form state
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authBusy, setAuthBusy] = useState(false);

  // name onboarding state
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
        } else {
          setNeedsName(true);
        }
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

  async function handleAuthSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAuthError(null);
    setAuthBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (err: any) {
      setAuthError(translateAuthError(err?.message));
    } finally {
      setAuthBusy(false);
    }
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

  // Logged in, but needs to provide full name (first login onboarding)
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

  // Not logged in: auth screen
  return (
    <div className="flex-1 flex flex-col justify-center px-6 py-10">
      <div className="text-center mb-8">
        <div className="text-5xl mb-3">🍜</div>
        <h1 className="text-2xl font-bold text-brand">Nét Huế</h1>
        <p className="text-neutral-500 text-sm mt-1">
          Đặt cơm trưa hàng ngày cùng đồng nghiệp
        </p>
      </div>

      <div className="flex rounded-xl bg-neutral-100 p-1 mb-5">
        <button
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
            mode === "signin" ? "bg-white shadow text-brand" : "text-neutral-500"
          }`}
          onClick={() => setMode("signin")}
        >
          Đăng nhập
        </button>
        <button
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
            mode === "signup" ? "bg-white shadow text-brand" : "text-neutral-500"
          }`}
          onClick={() => setMode("signup")}
        >
          Đăng ký
        </button>
      </div>

      <form onSubmit={handleAuthSubmit} className="space-y-3">
        <input
          type="email"
          required
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border border-neutral-300 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-brand"
        />
        <input
          type="password"
          required
          minLength={6}
          placeholder="Mật khẩu (tối thiểu 6 ký tự)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border border-neutral-300 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-brand"
        />
        {authError && (
          <p className="text-red-600 text-sm text-center">{authError}</p>
        )}
        <button
          type="submit"
          disabled={authBusy}
          className="w-full bg-brand text-white font-semibold py-3 rounded-xl disabled:opacity-50"
        >
          {authBusy
            ? "Đang xử lý..."
            : mode === "signup"
            ? "Đăng ký"
            : "Đăng nhập"}
        </button>
      </form>

      <p className="text-center text-xs text-neutral-400 mt-6">
        🔜 Đăng nhập bằng Google sẽ sớm được bổ sung
      </p>
    </div>
  );
}

function translateAuthError(msg?: string): string {
  if (!msg) return "Có lỗi xảy ra, vui lòng thử lại.";
  if (msg.includes("Invalid login credentials"))
    return "Sai email hoặc mật khẩu.";
  if (msg.includes("already registered") || msg.includes("already exists"))
    return "Email này đã được đăng ký, vui lòng đăng nhập.";
  if (msg.includes("Password should be"))
    return "Mật khẩu cần tối thiểu 6 ký tự.";
  if (msg.includes("Unable to validate email"))
    return "Email không hợp lệ.";
  return msg;
}
