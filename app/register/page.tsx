"use client";
import { useState } from "react";
import Image from "next/image";

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || "http://localhost:1337";

export default function RegisterPage() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    firstName: "", lastName: "", email: "", phone: "", password: "",
    gender: "", birthDate: "", nationality: "", residenceCountry: "",
    educationLevel: "", telegram: "", howDidYouKnow: "",
    currentLevel: "", availableHours: "",
  });

  const set = (k: string, v: string) => setForm({ ...form, [k]: v });

  const validateStep1 = () => {
    if (!form.firstName) return "يرجى إدخال الاسم الأول";
    if (!form.lastName) return "يرجى إدخال اسم العائلة";
    if (!form.email) return "يرجى إدخال البريد الإلكتروني";
    if (!form.phone) return "يرجى إدخال رقم الهاتف";
    if (!form.password || form.password.length < 6) return "كلمة المرور يجب أن تكون 6 أحرف على الأقل";
    if (!form.gender) return "يرجى اختيار الجنس";
    if (!form.birthDate) return "يرجى إدخال تاريخ الميلاد";
    return "";
  };

  const validateStep2 = () => {
    if (!form.nationality) return "يرجى إدخال الجنسية";
    if (!form.residenceCountry) return "يرجى إدخال بلد الإقامة";
    if (!form.educationLevel) return "يرجى اختيار المستوى التعليمي";
    if (!form.telegram) return "يرجى إدخال حساب التلقرام";
    if (!form.currentLevel) return "يرجى اختيار مستواك الحالي في الإنجليزية";
    if (!form.howDidYouKnow) return "يرجى اختيار كيف عرفت الأكاديمية";
    if (!form.availableHours) return "يرجى اختيار عدد الساعات المتاحة";
    return "";
  };

  const handleNext = () => {
    const err = validateStep1();
    if (err) { setError(err); return; }
    setError("");
    setStep(2);
  };

  const handleSubmit = async () => {
    const err = validateStep2();
    if (err) { setError(err); return; }
    setError("");
    setLoading(true);

    try {
      const registerRes = await fetch(`${STRAPI_URL}/api/auth/local/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: form.email,
          email: form.email,
          password: form.password,
        }),
      });

      const registerData = await registerRes.json();
      if (!registerRes.ok) {
        setError(registerData?.error?.message || "حدث خطأ، يرجى المحاولة مجدداً");
        return;
      }

      const jwt = registerData.jwt;
      const userId = registerData.user.id;

      await fetch(`${STRAPI_URL}/api/users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` },
        body: JSON.stringify({
          firstName: form.firstName,
          lastName: form.lastName,
          phone: form.phone,
          gender: form.gender || null,
          birthDate: form.birthDate || null,
          nationality: form.nationality || null,
          residenceCountry: form.residenceCountry,
          educationLevel: form.educationLevel || null,
          telegram: form.telegram,
          howDidYouKnow: form.howDidYouKnow || null,
          availableHours: form.availableHours || null,
          registrationStatus: "pending",
        }),
      });

      localStorage.setItem("jwt", jwt);
      localStorage.setItem("user", JSON.stringify(registerData.user));
      document.cookie = `jwt=${jwt}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`;
      setSuccess(true);
    } catch {
      setError("تعذّر الاتصال بالخادم، يرجى المحاولة لاحقاً");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-[var(--primary-dark)] via-[var(--primary)] to-[var(--primary-light)] flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-2xl p-10 max-w-md text-center">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5">
            <span className="text-green-500 text-4xl">✓</span>
          </div>
          <h2 className="text-2xl font-bold text-[var(--primary)] mb-3">تم التسجيل بنجاح! 🎉</h2>
          <p className="text-[var(--text-gray)] mb-6">مرحباً بك في أكاديمية E.L.A — سيتم مراجعة طلبك وإبلاغك بالنتيجة قريباً</p>
          <a href="/dashboard" className="inline-block px-8 py-3 bg-[var(--primary)] text-white rounded-xl font-bold hover:bg-[var(--primary-dark)] transition">
            الذهاب للوحة التحكم
          </a>
        </div>
      </main>
    );
  }

  const inputClass = "w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-black bg-gray-50 focus:outline-none focus:border-[var(--primary-light)] focus:bg-white transition";
  const selectClass = "w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-black bg-gray-50 focus:outline-none focus:border-[var(--primary-light)] focus:bg-white transition appearance-none";
  const labelClass = "block text-sm font-medium text-[var(--text-dark)] mb-1";

  return (
    <main className="min-h-screen bg-gradient-to-br from-[var(--primary-dark)] via-[var(--primary)] to-[var(--primary-light)] flex items-center justify-center px-4 py-24">
      <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-10 w-full max-w-lg">
        <div className="text-center mb-8">
          <Image src="/logo.png" alt="E.L.A" width={70} height={70} className="mx-auto mb-4 object-contain" />
          <h2 className="text-xl font-bold text-[var(--primary)]">التسجيل في أكاديمية E.L.A</h2>
          <p className="text-[var(--text-gray)] text-sm mt-1">Beyond Language – Toward Excellence</p>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center justify-center gap-4 mb-8">
          {[1, 2].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                step >= s ? "bg-[var(--primary)] text-white" : "bg-gray-100 text-gray-400"
              }`}>
                {s}
              </div>
              <span className={`text-xs font-medium ${step >= s ? "text-[var(--primary)]" : "text-gray-400"}`}>
                {s === 1 ? "البيانات الأساسية" : "معلومات إضافية"}
              </span>
            </div>
          ))}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm text-center">{error}</div>
        )}

        {step === 1 ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><label className={labelClass}>الاسم الأول *</label><input className={inputClass} value={form.firstName} onChange={(e) => set("firstName", e.target.value)} /></div>
              <div><label className={labelClass}>اسم العائلة *</label><input className={inputClass} value={form.lastName} onChange={(e) => set("lastName", e.target.value)} /></div>
            </div>
            <div><label className={labelClass}>البريد الإلكتروني *</label><input type="email" className={inputClass} value={form.email} onChange={(e) => set("email", e.target.value)} /></div>
            <div><label className={labelClass}>رقم الهاتف (مع رمز الدولة) *</label><input className={inputClass} value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+966..." /></div>
            <div><label className={labelClass}>كلمة المرور *</label><input type="password" className={inputClass} value={form.password} onChange={(e) => set("password", e.target.value)} placeholder="6 أحرف على الأقل" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>الجنس *</label>
                <select className={selectClass} value={form.gender} onChange={(e) => set("gender", e.target.value)}>
                  <option value="">اختر</option>
                  <option value="male">ذكر</option>
                  <option value="female">أنثى</option>
                </select>
              </div>
              <div><label className={labelClass}>تاريخ الميلاد *</label><input type="date" className={inputClass} value={form.birthDate} onChange={(e) => set("birthDate", e.target.value)} /></div>
            </div>
            <button onClick={handleNext} className="w-full bg-[var(--primary)] text-white py-3 rounded-xl font-bold hover:bg-[var(--primary-dark)] transition">
              التالي ←
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><label className={labelClass}>الجنسية *</label><input className={inputClass} value={form.nationality} onChange={(e) => set("nationality", e.target.value)} /></div>
              <div><label className={labelClass}>بلد الإقامة *</label><input className={inputClass} value={form.residenceCountry} onChange={(e) => set("residenceCountry", e.target.value)} /></div>
            </div>
            <div>
              <label className={labelClass}>المستوى التعليمي *</label>
              <select className={selectClass} value={form.educationLevel} onChange={(e) => set("educationLevel", e.target.value)}>
                <option value="">اختر</option>
                <option value="primary">ابتدائي</option>
                <option value="intermediate">متوسط</option>
                <option value="secondary">ثانوي</option>
                <option value="university">جامعي</option>
                <option value="postgraduate">دراسات عليا</option>
              </select>
            </div>
            <div><label className={labelClass}>حساب التلقرام *</label><input className={inputClass} value={form.telegram} onChange={(e) => set("telegram", e.target.value)} placeholder="@username" /></div>
            <div>
              <label className={labelClass}>مستواك الحالي في الإنجليزية *</label>
              <select className={selectClass} value={form.currentLevel} onChange={(e) => set("currentLevel", e.target.value)}>
                <option value="">اختر</option>
                <option value="beginner">مبتدئ (A1-A2)</option>
                <option value="intermediate">متوسط (B1)</option>
                <option value="upper_intermediate">فوق المتوسط (B2)</option>
                <option value="advanced">متقدم (C1-C2)</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>كيف عرفت الأكاديمية؟ *</label>
              <select className={selectClass} value={form.howDidYouKnow} onChange={(e) => set("howDidYouKnow", e.target.value)}>
                <option value="">اختر</option>
                <option value="social_media">وسائل التواصل</option>
                <option value="friend">صديق</option>
                <option value="search_engine">محرك بحث</option>
                <option value="other">غير ذلك</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>كم ساعة يومياً يمكنك تخصيصها؟ *</label>
              <select className={selectClass} value={form.availableHours} onChange={(e) => set("availableHours", e.target.value)}>
                <option value="">اختر</option>
                <option value="one">ساعة واحدة</option>
                <option value="two">ساعتان</option>
                <option value="three">3 ساعات</option>
                <option value="four">4 ساعات</option>
                <option value="five_plus">5 ساعات أو أكثر</option>
              </select>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="flex-1 py-3 border-2 border-gray-200 text-[var(--text-gray)] rounded-xl font-bold hover:bg-gray-50 transition">
                → رجوع
              </button>
              <button onClick={handleSubmit} disabled={loading} className="flex-1 bg-[var(--primary)] text-white py-3 rounded-xl font-bold hover:bg-[var(--primary-dark)] transition disabled:opacity-60">
                {loading ? "جاري التسجيل..." : "تسجيل ✓"}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}