"use client";
import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || "http://localhost:1337";

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const code = searchParams.get("code") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    if (!password || password.length < 6) { setError("كلمة المرور يجب أن تكون 6 أحرف على الأقل"); return; }
    if (password !== confirm) { setError("كلمتا المرور غير متطابقتين"); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch(`${STRAPI_URL}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, password, passwordConfirmation: confirm }),
      });
      if (res.ok) { setSuccess(true); setTimeout(() => router.push("/login"), 3000); }
      else { setError("الرابط منتهي أو غير صالح"); }
    } catch { setError("تعذّر الاتصال بالخادم"); }
    finally { setLoading(false); }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-[var(--primary-dark)] via-[var(--primary)] to-[var(--primary-light)] flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-2xl p-10 w-full max-w-sm text-center">
        <Image src="/logo.png" alt="E.L.A" width={70} height={70} className="mx-auto mb-4 object-contain" />
        <h2 className="text-xl font-bold text-[var(--primary)] mb-4">إعادة تعيين كلمة المرور</h2>
        {success ? (
          <div>
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <span className="text-green-500 text-3xl">✓</span>
            </div>
            <p className="text-[var(--text-gray)] text-sm">تم تغيير كلمة المرور بنجاح! جاري التحويل...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{error}</div>}
            <input type="password" placeholder="كلمة المرور الجديدة" value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-black bg-gray-50 focus:outline-none focus:border-[var(--primary-light)] transition" />
            <input type="password" placeholder="تأكيد كلمة المرور" value={confirm} onChange={(e) => setConfirm(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-black bg-gray-50 focus:outline-none focus:border-[var(--primary-light)] transition" />
            <button onClick={handleSubmit} disabled={loading}
              className="w-full bg-[var(--primary)] text-white py-3 rounded-xl font-bold hover:bg-[var(--primary-dark)] transition disabled:opacity-60">
              {loading ? "جاري التغيير..." : "تغيير كلمة المرور"}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}