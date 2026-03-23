import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

export const metadata: Metadata = {
  title: "E.L.A Academy | Beyond Language – Toward Excellence",
  description: "أكاديمية E.L.A لتعليم اللغة الإنجليزية - تعلم الإنجليزية واتقنها مع أفضل المدرسين",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl">
      <body className="bg-[var(--soft-white)] text-[var(--text-dark)] antialiased">
        <Navbar />
        {children}
        <Footer />
      </body>
    </html>
  );
}