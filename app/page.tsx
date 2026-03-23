"use client";
import Image from "next/image";
import Link from "next/link";

export default function HomePage() {
  return (
    <>
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center overflow-hidden bg-gradient-to-br from-[var(--primary-dark)] via-[var(--primary)] to-[var(--primary-light)]">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, rgba(255,255,255,0.3) 1px, transparent 0)`,
            backgroundSize: '40px 40px'
          }} />
        </div>
        
        {/* Floating shapes */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-[var(--primary-light)] rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-[var(--accent)] rounded-full mix-blend-multiply filter blur-xl opacity-15 animate-pulse" style={{ animationDelay: '2s' }} />

        <div className="relative z-10 mx-auto max-w-7xl px-6 py-20 flex flex-col md:flex-row items-center gap-12 w-full">
          {/* Text Content */}
          <div className="flex-1 text-center md:text-right">
            <div className="inline-block px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full border border-white/20 mb-6">
              <span className="text-white/90 text-sm font-medium">🌍 تعلّم من أي مكان في العالم</span>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-extrabold text-white leading-tight mb-6">
              أكاديمية{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-l from-blue-300 to-cyan-300">
                E.L.A
              </span>
              <br />
              <span className="text-2xl md:text-3xl font-medium text-blue-200 mt-2 block">
                Beyond Language – Toward Excellence
              </span>
            </h1>
            
            <p className="text-lg md:text-xl text-blue-100/80 max-w-xl mb-8 leading-relaxed mx-auto md:mx-0">
              نقدم لك تجربة تعليمية احترافية لإتقان اللغة الإنجليزية مع نخبة من المدرسين المتخصصين عبر الإنترنت
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
              <Link href="/register"
                className="px-8 py-4 bg-white text-[var(--primary)] rounded-xl font-bold text-lg hover:bg-blue-50 transition-all shadow-lg hover:shadow-xl hover:-translate-y-1">
                سجّل الآن مجاناً
              </Link>
              <Link href="/features"
                className="px-8 py-4 border-2 border-white/30 text-white rounded-xl font-bold text-lg hover:bg-white/10 transition-all backdrop-blur-sm">
                تعرّف على المميزات
              </Link>
            </div>

            {/* Stats */}
            <div className="flex gap-8 mt-12 justify-center md:justify-start">
              {[
                { num: "+500", label: "طالب مسجل" },
                { num: "+20", label: "مدرس متخصص" },
                { num: "+50", label: "دورة تدريبية" },
              ].map((s, i) => (
                <div key={i} className="text-center">
                  <div className="text-2xl md:text-3xl font-extrabold text-white">{s.num}</div>
                  <div className="text-sm text-blue-200/70">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Logo / Visual */}
          <div className="flex-1 flex justify-center">
            <div className="relative w-72 h-72 md:w-96 md:h-96">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full blur-3xl" />
              <Image
                src="/logo.png"
                alt="E.L.A Academy"
                fill
                className="object-contain drop-shadow-2xl relative z-10"
                priority
              />
            </div>
          </div>
        </div>

        {/* Wave Bottom */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0,60 C360,120 720,0 1440,60 L1440,120 L0,120 Z" fill="var(--soft-white)" />
          </svg>
        </div>
      </section>

      {/* About Section */}
      <section className="py-20 bg-[var(--soft-white)]">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-extrabold text-[var(--primary)]">
              لماذا أكاديمية E.L.A؟
            </h2>
            <div className="mx-auto mt-4 h-1 w-20 rounded-full bg-[var(--primary-light)]" />
            <p className="mx-auto mt-6 max-w-2xl text-[var(--text-gray)] leading-8">
              نؤمن أن تعلم اللغة الإنجليزية ليس مجرد دراسة قواعد ومفردات، بل رحلة نحو التميّز والانفتاح على العالم
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: "🎓",
                title: "مدرسون متخصصون",
                desc: "نخبة من المعلمين ذوي الخبرة والشهادات المعتمدة في تعليم الإنجليزية كلغة ثانية"
              },
              {
                icon: "💻",
                title: "تعليم إلكتروني متطور",
                desc: "منصة تعليمية حديثة مع دروس مباشرة عبر Zoom وتسجيلات متاحة على مدار الساعة"
              },
              {
                icon: "📊",
                title: "تقييم مستمر",
                desc: "اختبارات دورية وتقارير تقدم شخصية لمتابعة مستواك خطوة بخطوة"
              },
              {
                icon: "🌍",
                title: "تعلم من أي مكان",
                desc: "سواء كنت في الوطن العربي أو أي مكان في العالم، الأكاديمية متاحة لك"
              },
              {
                icon: "📜",
                title: "شهادات معتمدة",
                desc: "احصل على شهادة إتمام معتمدة من الأكاديمية عند إنهاء كل مستوى بنجاح"
              },
              {
                icon: "🤝",
                title: "مجتمع تعليمي",
                desc: "انضم لمجتمع من المتعلمين وتبادل الخبرات مع زملائك من مختلف أنحاء العالم"
              },
            ].map((item, i) => (
              <div key={i} className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 hover:border-[var(--primary-light)]/30 group hover:-translate-y-1">
                <div className="w-14 h-14 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center text-2xl mb-5 group-hover:bg-[var(--primary)] group-hover:scale-110 transition-all duration-300">
                  <span className="group-hover:scale-110 transition-transform">{item.icon}</span>
                </div>
                <h3 className="text-lg font-bold text-[var(--primary)] mb-3">{item.title}</h3>
                <p className="text-[var(--text-gray)] leading-7 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Levels Section */}
      <section className="py-20 bg-white">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-extrabold text-[var(--primary)]">
              المستويات الدراسية
            </h2>
            <div className="mx-auto mt-4 h-1 w-20 rounded-full bg-[var(--primary-light)]" />
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            {[
              { level: "A1-A2", name: "مبتدئ", desc: "أساسيات اللغة والمحادثة البسيطة", color: "from-green-400 to-emerald-500" },
              { level: "B1", name: "متوسط", desc: "محادثة يومية وقراءة وكتابة", color: "from-blue-400 to-cyan-500" },
              { level: "B2", name: "فوق المتوسط", desc: "مهارات متقدمة وتحضير للاختبارات", color: "from-purple-400 to-violet-500" },
              { level: "C1-C2", name: "متقدم", desc: "إتقان كامل واستخدام أكاديمي ومهني", color: "from-orange-400 to-red-500" },
            ].map((l, i) => (
              <div key={i} className="relative bg-white rounded-2xl p-6 border border-gray-100 hover:shadow-xl transition-all duration-300 overflow-hidden group hover:-translate-y-2">
                <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-l ${l.color}`} />
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${l.color} flex items-center justify-center mb-5 shadow-lg`}>
                  <span className="text-white font-extrabold text-sm">{l.level}</span>
                </div>
                <h3 className="text-xl font-bold text-[var(--primary)] mb-2">{l.name}</h3>
                <p className="text-[var(--text-gray)] text-sm leading-7">{l.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-[var(--primary)] to-[var(--primary-dark)] relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, rgba(255,255,255,0.3) 1px, transparent 0)`,
            backgroundSize: '30px 30px'
          }} />
        </div>
        <div className="relative z-10 mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-6">
            ابدأ رحلتك مع E.L.A اليوم
          </h2>
          <p className="text-blue-100/80 text-lg mb-10 leading-relaxed">
            لا تنتظر أكثر — سجّل الآن وانضم لمئات الطلاب الذين بدأوا بتغيير مستقبلهم
          </p>
          <Link href="/register"
            className="inline-block px-10 py-4 bg-white text-[var(--primary)] rounded-xl font-bold text-lg hover:bg-blue-50 transition-all shadow-lg hover:shadow-xl hover:-translate-y-1">
            سجّل مجاناً الآن 🚀
          </Link>
        </div>
      </section>
    </>
  );
}