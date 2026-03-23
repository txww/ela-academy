"use client";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || "http://localhost:1337";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!email) { setError("يرجى إدخال البريد الإلكتروني"); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch(`${STRAPI_URL}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.ok) { setSent(true); }
      else { setError("حدث خطأ، تأكد من البريد الإلكتروني"); }
    } catch { setError("تعذّر الاتصال بالخادم"); }
    finally { setLoading(false); }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-[var(--primary-dark)] via-[var(--primary)] to-[var(--primary-light)] flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-2xl p-10 w-full max-w-sm text-center">
        <Image src="/logo.png" alt="E.L.A" width={70} height={70} className="mx-auto mb-4 object-contain" />
        <h2 className="text-xl font-bold text-[var(--primary)] mb-2">نسيت كلمة المرور</h2>
        {sent ? (
          <div>
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4 mt-4">
              <span className="text-green-500 text-3xl">✓</span>
            </div>
            <p className="text-[var(--text-gray)] text-sm mb-6">تم إرسال رابط إعادة التعيين إلى بريدك الإلكتروني</p>
            <Link href="/login" className="text-[var(--primary)] font-bold text-sm hover:underline">العودة لتسجيل الدخول</Link>
          </div>
        ) : (
          <div className="space-y-4 mt-4">
            <p className="text-[var(--text-gray)] text-sm">أدخل بريدك الإلكتروني وسنرسل لك رابطاً لإعادة التعيين</p>
            {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{error}</div>}
            <input type="email" placeholder="البريد الإلكتروني" value={email} onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-black bg-gray-50 focus:outline-none focus:border-[var(--primary-light)] transition" />
            <button onClick={handleSubmit} disabled={loading}
              className="w-full bg-[var(--primary)] text-white py-3 rounded-xl font-bold hover:bg-[var(--primary-dark)] transition disabled:opacity-60">
              {loading ? "جاري الإرسال..." : "إرسال رابط إعادة التعيين"}
            </button>
            <Link href="/login" className="block text-sm text-[var(--text-gray)] hover:text-[var(--primary)]">العودة لتسجيل الدخول</Link>
          </div>
        )}
      </div>
    </main>
  );
}