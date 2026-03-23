"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || "http://localhost:1337";
const ADMIN_EMAIL = "admin@ela.com";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ identifier: "", password: "" });

  const handleSubmit = async () => {
    if (!form.identifier || !form.password) {
      setError("يرجى إدخال البريد الإلكتروني وكلمة المرور");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${STRAPI_URL}/api/auth/local`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data?.error?.message || "بيانات الدخول غير صحيحة");
        return;
      }

      localStorage.setItem("jwt", data.jwt);
      localStorage.setItem("user", JSON.stringify(data.user));
      document.cookie = `jwt=${data.jwt}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`;

      // Redirect based on role
      if (data.user.email === ADMIN_EMAIL) {
        router.push("/ela-control-panel/students");
      } else if (data.user.isTeacher) {
        router.push("/teacher");
      } else {
        router.push("/dashboard");
      }
    } catch {
      setError("تعذّر الاتصال بالخادم");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-[var(--primary-dark)] via-[var(--primary)] to-[var(--primary-light)] flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-2xl p-10 w-full max-w-sm">
        <div className="text-center mb-8">
          <Image src="/logo.png" alt="E.L.A" width={80} height={80} className="mx-auto mb-4 object-contain" />
          <h2 className="text-xl font-bold text-[var(--primary)]">تسجيل الدخول</h2>
          <p className="text-[var(--text-gray)] text-sm mt-1">E.L.A Academy</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm text-center">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <input
            type="email"
            placeholder="البريد الإلكتروني"
            value={form.identifier}
            onChange={(e) => setForm({ ...form, identifier: e.target.value })}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-black bg-gray-50 focus:outline-none focus:border-[var(--primary-light)] focus:bg-white transition"
          />
          <input
            type="password"
            placeholder="كلمة المرور"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-black bg-gray-50 focus:outline-none focus:border-[var(--primary-light)] focus:bg-white transition"
          />

          <div className="text-left">
            <Link href="/forgot-password" className="text-sm text-[var(--primary-light)] hover:underline">
              نسيت كلمة المرور؟
            </Link>
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-[var(--primary)] text-white py-3 rounded-xl font-bold hover:bg-[var(--primary-dark)] transition disabled:opacity-60"
          >
            {loading ? "جاري الدخول..." : "دخول"}
          </button>
        </div>

        <p className="text-center text-sm text-[var(--text-gray)] mt-6">
          ليس لديك حساب؟{" "}
          <Link href="/register" className="text-[var(--primary)] font-bold hover:underline">
            سجّل الآن
          </Link>
        </p>
      </div>
    </main>
  );
}