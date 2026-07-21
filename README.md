# Nét Huế - Đặt cơm trưa

Web app mobile-first để đặt cơm trưa hàng ngày cùng đồng nghiệp.

## Chạy local

```
npm install
npm run dev
```

Mở http://localhost:3000

## Backend

Dùng Supabase (project: `nethue-lunch-order`, ref `qovcisdgzhwlbaeonliy`):
- Postgres: bảng `profiles`, `dish_categories`, `dishes`, `order_items`, `vouchers`
- Auth: email/password tạm thời (đã bật auto-confirm qua trigger DB, không cần xác nhận email)
- Storage: bucket `vouchers` (public) để lưu ảnh voucher

URL và anon key đã được cấu hình sẵn trong `lib/supabaseClient.ts` (anon key an toàn để public, được bảo vệ bằng Row Level Security).

## Thêm đăng nhập Google (sau này)

1. Vào Supabase Dashboard → Authentication → Providers → bật Google, điền Client ID/Secret (tạo tại Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client ID, loại "Web application", thêm redirect URI theo hướng dẫn của Supabase).
2. Trong `app/page.tsx`, thêm nút gọi:
   ```ts
   supabase.auth.signInWithOAuth({ provider: "google" })
   ```
3. Có thể giữ song song cả email/password và Google, hoặc bỏ hẳn form email/password.

## Deploy

Deploy trên Vercel (framework Next.js tự nhận diện). Không cần biến môi trường bổ sung vì Supabase URL/key đã hardcode trong code (public-safe).
