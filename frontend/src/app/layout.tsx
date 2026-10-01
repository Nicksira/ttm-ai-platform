import type { Metadata } from "next";
import "./globals.css"; // ⚠️ บรรทัดนี้คือหัวใจสำคัญที่ทำให้ Tailwind ทำงาน!

export const metadata: Metadata = {
  title: "TTM Arthritis Precision Care",
  description: "Medical AI & Digital Twin Infrastructure",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      {/* ใส่คลาส antialiased เพื่อให้ฟอนต์เนียนเรียบสไตล์ Apple */}
      <body className="antialiased bg-[#F5F5F7] text-[#1D1D1F]">
        {children}
      </body>
    </html>
  );
}