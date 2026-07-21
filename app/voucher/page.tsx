"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import { todayVN } from "@/lib/date";
import type { Voucher } from "@/lib/types";

export default function VoucherPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [fullName, setFullName] = useState("");

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [todayVouchers, setTodayVouchers] = useState<Voucher[]>([]);

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
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", u.id)
        .maybeSingle();
      if (!mounted) return;
      setFullName(profile?.full_name || "");
      await loadVouchers();
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  async function loadVouchers() {
    const { data } = await supabase
      .from("vouchers")
      .select("*")
      .eq("voucher_date", todayVN())
      .order("created_at", { ascending: false });
    setTodayVouchers(data || []);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setSuccess(false);
    setError(null);
    setPreviewUrl(URL.createObjectURL(f));
  }

  async function handleUpload() {
    if (!file || !user) return;
    setUploading(true);
    setError(null);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${todayVN()}/${user.id}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("vouchers")
        .upload(path, file, { upsert: false });
      if (upErr) throw upErr;

      const { data: pub } = supabase.storage.from("vouchers").getPublicUrl(path);

      const { error: insErr } = await supabase.from("vouchers").insert({
        user_id: user.id,
        user_name: fullName,
        image_url: pub.publicUrl,
      });
      if (insErr) throw insErr;

      setSuccess(true);
      setFile(null);
      setPreviewUrl(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      await loadVouchers();
    } catch (err: any) {
      setError("Có lỗi khi gửi voucher, vui lòng thử lại.");
    } finally {
      setUploading(false);
    }
  }

  if (loading) {
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
        <h1 className="font-semibold text-neutral-800">Gửi voucher</h1>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
          id="voucher-file-input"
        />

        {previewUrl ? (
          <div className="mb-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Xem trước voucher"
              className="w-full rounded-2xl border border-neutral-200 object-contain max-h-72"
            />
          </div>
        ) : (
          <label
            htmlFor="voucher-file-input"
            className="flex flex-col items-center justify-center border-2 border-dashed border-neutral-300 rounded-2xl py-12 mb-4 cursor-pointer text-neutral-400"
          >
            <div className="text-4xl mb-2">📤</div>
            <span className="text-sm">Bấm để chọn ảnh voucher</span>
          </label>
        )}

        {previewUrl && (
          <label
            htmlFor="voucher-file-input"
            className="block text-center text-sm text-brand underline mb-4 cursor-pointer"
          >
            Chọn ảnh khác
          </label>
        )}

        {error && <p className="text-red-600 text-sm text-center mb-2">{error}</p>}
        {success && (
          <p className="text-green-600 text-sm text-center mb-2">
            ✓ Đã gửi voucher thành công!
          </p>
        )}

        <button
          disabled={!file || uploading}
          onClick={handleUpload}
          className="w-full bg-brand text-white font-semibold py-3 rounded-xl disabled:opacity-30 disabled:bg-neutral-400 mb-8"
        >
          {uploading ? "Đang gửi..." : "Gửi voucher"}
        </button>

        <h2 className="font-medium text-neutral-700 mb-2 text-sm">
          Voucher đã gửi hôm nay ({todayVouchers.length})
        </h2>
        {todayVouchers.length === 0 ? (
          <p className="text-neutral-400 text-sm">Chưa có voucher nào.</p>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {todayVouchers.map((v) => (
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
