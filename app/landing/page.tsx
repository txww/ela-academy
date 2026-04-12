
"use client";
import { useState, useEffect, useRef } from "react";
import Image from "next/image";

export default function LandingPage() {
  const [isVisible, setIsVisible] = useState(false);
  const [activeLevel, setActiveLevel] = useState(0);
  const [count, setCount] = useState({ students: 0, sections: 0, countries: 0 });
  const statsRef = useRef<HTMLDivElement>(null);
  const [statsStarted, setStatsStarted] = useState(false);

  useEffect(() => {
    setTimeout(() => setIsVisible(true), 100);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting && !statsStarted) { setStatsStarted(true); animateStats(); } },
      { threshold: 0.3 }
    );
    if (statsRef.current) observer.observe(statsRef.current);
    return () => observer.disconnect();
  }, [statsStarted]);

  const animateStats = () => {
    const targets = { students: 150, sections: 10, countries: 15 };
    const duration = 2000;
    const steps = 60;
    const interval = duration / steps;
    let step = 0;
    const timer = setInterval(() => {
      step++;
      const progress = step / steps;
      const ease = 1 - Math.pow(1 - progress, 3);
      setCount({
        students: Math.floor(targets.students * ease),
        sections: Math.floor(targets.sections * ease),
        countries: Math.floor(targets.countries * ease),
      });
      if (step >= steps) clearInterval(timer);
    }, interval);
  };

  const levels = [
    { name: "Intro (Zero)", ar: "المبتدئ", desc: "للمبتدئين الذين يبدأون من الصفر", icon: "🌱", color: "from-emerald-400 to-teal-500" },
    { name: "Level 1", ar: "الأساسي", desc: "بناء الأساس اللغوي القوي", icon: "📗", color: "from-blue-400 to-cyan-500" },
    { name: "Level 2", ar: "المتوسط", desc: "تطوير مهارات التواصل", icon: "📘", color: "from-violet-400 to-purple-500" },
    { name: "Level 3", ar: "المتقدم", desc: "إتقان اللغة بثقة عالية", icon: "📙", color: "from-orange-400 to-amber-500" },
    { name: "Conversation", ar: "المحادثة", desc: "طلاقة كاملة في الحديث", icon: "🎯", color: "from-rose-400 to-pink-500" },
  ];

  const features = [
    { icon: "🎓", title: "مدرسون محترفون", desc: "فريق من المدرسين المتخصصين بخبرة عالية في تعليم اللغة الإنجليزية" },
    { icon: "👥", title: "مجموعات صغيرة", desc: "7 طلاب كحد أقصى في كل شعبة لضمان الاهتمام الفردي بكل طالب" },
    { icon: "🌐", title: "أونلاين 100%", desc: "تعلّم من أي مكان في العالم بدون قيود جغرافية عبر Zoom" },
    { icon: "⏰", title: "مواعيد مرنة", desc: "جلسات SMW وSTT بتوقيتات متعددة تناسب جدولك اليومي" },
    { icon: "🆓", title: "تجربة مجانية", desc: "جرّب قبل أن تدفع — حصة مجانية كاملة بدون أي التزام" },
    { icon: "📈", title: "تقدم مضمون", desc: "منهج مدروس ومتابعة مستمرة لضمان تطورك في كل مستوى" },
  ];

  const testimonials = [
    { name: "سارة المحمد", country: "🇸🇦 السعودية", level: "Level 2", text: "بعد شهرين مع E.L.A أصبحت أتحدث الإنجليزية بثقة في العمل. المدرس كان ممتازاً والمجموعة الصغيرة فرقت كثيراً!", stars: 5 },
    { name: "أحمد الخطيب", country: "🇸🇾 سوريا", level: "Conversation", text: "تجربة رائعة جداً! الجدول المنظم والمتابعة الشخصية من الأستاذ جعلت التعلم سهلاً وممتعاً.", stars: 5 },
    { name: "فاطمة النور", country: "🇹🇷 تركيا", level: "Level 1", text: "بدأت من الصفر وخلال 3 أشهر أصبحت أفهم وأتكلم! E.L.A غيّرت حياتي المهنية.", stars: 5 },
  ];

  return (
    <div className="min-h-screen bg-[#080c18] text-white overflow-x-hidden" dir="rtl">
      {/* Animated background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#2e7fc2]/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-[#6244a5]/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: "1s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#2e7fc2]/5 rounded-full blur-[150px]" />
      </div>

      {/* HERO */}
      <section className="relative min-h-screen flex items-center justify-center px-4 py-20">
        <div className={`text-center max-w-4xl mx-auto transition-all duration-1000 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <div className="relative">
              <div className="absolute inset-0 bg-[#2e7fc2] rounded-full blur-xl opacity-30 scale-150" />
              <Image src="/logo.png" alt="E.L.A" width={100} height={100} className="relative object-contain drop-shadow-2xl" />
            </div>
          </div>

          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-[#2e7fc2]/20 border border-[#2e7fc2]/40 rounded-full px-4 py-2 text-sm text-[#2e7fc2] mb-6 backdrop-blur-sm">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            التسجيل مفتوح الآن — التجربة مجانية 🎁
          </div>

          <h1 className="text-5xl md:text-7xl font-black mb-6 leading-tight">
            <span className="text-white">تعلّم</span>
            <span className="bg-gradient-to-l from-[#2e7fc2] to-[#6244a5] bg-clip-text text-transparent"> الإنجليزية</span>
            <br />
            <span className="text-white">بطريقة</span>
            <span className="text-[#2e7fc2]"> مختلفة</span>
          </h1>

          <p className="text-xl md:text-2xl text-gray-300 mb-4 font-light">
            أكاديمية <strong className="text-white">E.L.A</strong> — دروس إنجليزية احترافية أونلاين
          </p>
          <p className="text-lg text-gray-400 mb-10 italic">
            "Beyond Language — Toward Excellence"
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="/register" className="group relative px-10 py-4 bg-gradient-to-l from-[#2e7fc2] to-[#6244a5] rounded-2xl font-black text-lg shadow-2xl shadow-[#2e7fc2]/30 hover:shadow-[#2e7fc2]/50 transition-all duration-300 hover:scale-105">
              <span className="relative z-10">ابدأ تجربتك المجانية 🚀</span>
            </a>
            <a href="#levels" className="px-10 py-4 border-2 border-white/20 rounded-2xl font-bold text-lg hover:border-[#2e7fc2]/60 hover:bg-[#2e7fc2]/10 transition-all duration-300">
              اكتشف المستويات ↓
            </a>
          </div>

          {/* Trust badges */}
          <div className="flex flex-wrap justify-center gap-6 mt-12 text-sm text-gray-400">
            {["✅ بدون التزام مسبق", "🔒 تجربة مجانية كاملة", "📱 أونلاين من أي مكان", "⚡ ابدأ خلال 24 ساعة"].map((b, i) => (
              <span key={i} className="flex items-center gap-1">{b}</span>
            ))}
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-gray-500 text-xs animate-bounce">
          <span>اسكرول للأسفل</span>
          <span>↓</span>
        </div>
      </section>

      {/* STATS */}
      <section ref={statsRef} className="relative py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-3 gap-4 md:gap-8">
            {[
              { value: count.students + "+", label: "طالب مسجّل", icon: "🎓" },
              { value: count.sections + "+", label: "شعبة نشطة", icon: "📚" },
              { value: count.countries + "+", label: "دولة حول العالم", icon: "🌍" },
            ].map((s, i) => (
              <div key={i} className="text-center p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
                <div className="text-3xl mb-2">{s.icon}</div>
                <div className="text-4xl md:text-5xl font-black text-[#2e7fc2]">{s.value}</div>
                <div className="text-gray-400 text-sm mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* LEVELS */}
      <section id="levels" className="relative py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-black mb-4">المستويات الدراسية</h2>
            <p className="text-gray-400 text-lg">من الصفر حتى الطلاقة الكاملة</p>
          </div>
          <div className="flex flex-col gap-4">
            {levels.map((level, i) => (
              <div key={i}
                className={`relative p-6 rounded-2xl border cursor-pointer transition-all duration-300 ${activeLevel === i ? "border-white/30 bg-white/10 scale-[1.02]" : "border-white/10 bg-white/5 hover:border-white/20"}`}
                onClick={() => setActiveLevel(i)}>
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${level.color} flex items-center justify-center text-2xl flex-shrink-0 shadow-lg`}>
                    {level.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-black text-lg">{level.name}</h3>
                      <span className="px-2 py-0.5 bg-white/10 rounded-full text-xs text-gray-300">{level.ar}</span>
                    </div>
                    <p className="text-gray-400 text-sm">{level.desc}</p>
                  </div>
                  <div className={`w-6 h-6 rounded-full border-2 flex-shrink-0 transition-all ${activeLevel === i ? `bg-gradient-to-br ${level.color} border-transparent` : "border-white/20"}`} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="relative py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-black mb-4">لماذا E.L.A؟</h2>
            <p className="text-gray-400 text-lg">ما يميّزنا عن غيرنا</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <div key={i} className="group p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-[#2e7fc2]/40 hover:bg-[#2e7fc2]/5 transition-all duration-300">
                <div className="text-4xl mb-4">{f.icon}</div>
                <h3 className="font-bold text-lg mb-2 group-hover:text-[#2e7fc2] transition-colors">{f.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="relative py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-black mb-4">كيف تبدأ؟</h2>
            <p className="text-gray-400 text-lg">4 خطوات بسيطة</p>
          </div>
          <div className="relative">
            <div className="absolute right-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-[#2e7fc2] to-[#6244a5] hidden md:block" />
            <div className="space-y-8">
              {[
                { step: "01", title: "سجّل مجاناً", desc: "أنشئ حسابك في دقيقتين بدون أي رسوم", icon: "📝" },
                { step: "02", title: "جلسة تجريبية", desc: "احضر حصة مجانية كاملة واكتشف مستواك", icon: "🎯" },
                { step: "03", title: "اختر شعبتك", desc: "نختار لك المجموعة المناسبة حسب مستواك وجدولك", icon: "📚" },
                { step: "04", title: "ابدأ رحلتك", desc: "انضم للجلسات وتطور مع كل درس", icon: "🚀" },
              ].map((s, i) => (
                <div key={i} className="flex items-start gap-6 md:pr-16 relative">
                  <div className="relative flex-shrink-0">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#2e7fc2] to-[#6244a5] flex items-center justify-center text-2xl shadow-lg shadow-[#2e7fc2]/20">
                      {s.icon}
                    </div>
                    <span className="absolute -top-2 -right-2 w-6 h-6 bg-[#080c18] border border-[#2e7fc2] rounded-full text-[10px] font-black text-[#2e7fc2] flex items-center justify-center">{s.step}</span>
                  </div>
                  <div className="pt-2">
                    <h3 className="font-black text-xl mb-1">{s.title}</h3>
                    <p className="text-gray-400">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="relative py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-black mb-4">ماذا يقول طلابنا؟</h2>
            <p className="text-gray-400 text-lg">تجارب حقيقية من طلابنا</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <div key={i} className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-[#2e7fc2]/30 transition-all duration-300">
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: t.stars }).map((_, j) => <span key={j} className="text-yellow-400">⭐</span>)}
                </div>
                <p className="text-gray-300 text-sm leading-relaxed mb-6">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#2e7fc2] to-[#6244a5] flex items-center justify-center font-bold text-sm">
                    {t.name[0]}
                  </div>
                  <div>
                    <p className="font-bold text-sm">{t.name}</p>
                    <p className="text-gray-500 text-xs">{t.country} • {t.level}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SCHEDULE */}
      <section className="relative py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-black mb-4">الجدول الأسبوعي</h2>
            <p className="text-gray-400 text-lg">مواعيد متعددة تناسب كل الجداول</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { group: "SMW", days: "السبت / الاثنين / الأربعاء", color: "from-blue-500 to-cyan-400", times: ["7:20 ص", "9:00 ص", "10:30 ص", "1:30 م", "4:30 م", "6:00 م"] },
              { group: "STT", days: "الأحد / الثلاثاء / الخميس", color: "from-purple-500 to-violet-400", times: ["3:00 م", "7:30 م", "10:30 م"] },
            ].map((g, i) => (
              <div key={i} className="p-6 rounded-2xl bg-white/5 border border-white/10">
                <div className={`inline-block px-4 py-2 rounded-xl bg-gradient-to-l ${g.color} font-black text-lg mb-3`}>{g.group}</div>
                <p className="text-gray-300 mb-4 text-sm">{g.days}</p>
                <div className="flex flex-wrap gap-2">
                  {g.times.map((t, j) => (
                    <span key={j} className="px-3 py-1.5 bg-white/10 rounded-lg text-sm font-medium">🕐 {t}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-24 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <div className="relative p-10 md:p-16 rounded-3xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-[#2e7fc2]/20 to-[#6244a5]/20 backdrop-blur-sm border border-white/10 rounded-3xl" />
            <div className="absolute inset-0 bg-gradient-to-br from-[#2e7fc2]/5 to-transparent rounded-3xl" />
            <div className="relative">
              <div className="text-6xl mb-6">🎓</div>
              <h2 className="text-4xl md:text-5xl font-black mb-4">
                جاهز تبدأ رحلتك؟
              </h2>
              <p className="text-gray-300 text-lg mb-8">
                سجّل الآن واحصل على <strong className="text-[#2e7fc2]">حصة تجريبية مجانية</strong> كاملة بدون أي التزام
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a href="/register" className="px-10 py-4 bg-gradient-to-l from-[#2e7fc2] to-[#6244a5] rounded-2xl font-black text-xl shadow-2xl shadow-[#2e7fc2]/30 hover:shadow-[#2e7fc2]/50 transition-all duration-300 hover:scale-105">
                  سجّل مجاناً الآن ←
                </a>
                <a href="https://wa.me/your-number" className="px-10 py-4 border-2 border-white/20 rounded-2xl font-bold text-lg hover:border-white/40 transition-all duration-300">
                  تواصل معنا على واتساب 💬
                </a>
              </div>
              <p className="text-gray-500 text-sm mt-6">لا يوجد بطاقة ائتمانية • لا يوجد التزام مسبق</p>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="relative py-10 px-4 border-t border-white/10">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="E.L.A" width={40} height={40} className="object-contain" />
            <div>
              <p className="font-black text-lg">E.L.A Academy</p>
              <p className="text-gray-500 text-xs">Beyond Language — Toward Excellence</p>
            </div>
          </div>
          <div className="flex gap-6 text-sm text-gray-400">
            <a href="/register" className="hover:text-white transition-colors">التسجيل</a>
            <a href="/login" className="hover:text-white transition-colors">تسجيل الدخول</a>
            <a href="/study-plan" className="hover:text-white transition-colors">الخطة الدراسية</a>
          </div>
          <p className="text-gray-600 text-xs">© 2026 E.L.A Academy</p>
        </div>
      </footer>
    </div>
  );
}
