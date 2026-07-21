import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nét Huế - Đặt cơm trưa",
  description: "Đặt món ăn trưa hàng ngày cùng đồng nghiệp",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#7A1F1F",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body className="bg-neutral-100 min-h-screen">
        <div className="max-w-md mx-auto min-h-screen bg-white shadow-sm flex flex-col">
          {children}
        </div>
      </body>
    </html>
  );
}
