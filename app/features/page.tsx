export default function FeaturesPage() {
  const features = [
    {
      icon: "🎯",
      title: "منهج علمي مدروس",
      desc: "خطة تعليمية متكاملة مبنية على أحدث أساليب تعليم اللغة الإنجليزية كلغة ثانية، من المبتدئ حتى المتقدم"
    },
    {
      icon: "👨‍🏫",
      title: "مدرسون متخصصون",
      desc: "نخبة من المعلمين الحاصلين على شهادات معتمدة في تعليم الإنجليزية مع خبرة واسعة"
    },
    {
      icon: "💻",
      title: "دروس مباشرة عبر Zoom",
      desc: "حصص تفاعلية مباشرة مع المدرس تتيح لك المشاركة والممارسة الفعلية"
    },
    {
      icon: "📹",
      title: "تسجيلات متاحة دائماً",
      desc: "جميع الدروس مسجلة ومتاحة على مدار الساعة لتراجعها في أي وقت يناسبك"
    },
    {
      icon: "📝",
      title: "اختبارات وتقييم مستمر",
      desc: "اختبارات دورية لقياس تقدمك مع تقارير مفصلة عن نقاط القوة والضعف"
    },
    {
      icon: "🗣️",
      title: "تركيز على المحادثة",
      desc: "جلسات محادثة أسبوعية لتطوير مهارات التحدث والاستماع في بيئة حقيقية"
    },
    {
      icon: "📚",
      title: "مواد تعليمية شاملة",
      desc: "كتب ومراجع وتمارين تفاعلية تغطي القواعد والمفردات والقراءة والكتابة"
    },
    {
      icon: "📜",
      title: "شهادات إتمام معتمدة",
      desc: "احصل على شهادة من الأكاديمية عند إتمام كل مستوى بنجاح"
    },
    {
      icon: "🌍",
      title: "تعلم من أي مكان",
      desc: "لا حدود جغرافية — انضم من أي بلد في العالم بجهاز كمبيوتر واتصال إنترنت"
    },
    {
      icon: "⏰",
      title: "مرونة في المواعيد",
      desc: "جداول مرنة تتناسب مع التزاماتك اليومية سواء كنت طالباً أو موظفاً"
    },
    {
      icon: "👥",
      title: "مجتمع تعليمي نشط",
      desc: "مجموعات دراسية وقنوات تفاعلية للتواصل مع زملائك وتبادل الخبرات"
    },
    {
      icon: "🎮",
      title: "تعلم ممتع وتفاعلي",
      desc: "أنشطة تفاعلية وتحديات أسبوعية تجعل التعلم تجربة ممتعة ومحفزة"
    },
  ];

  return (
    <main className="min-h-screen bg-[var(--soft-white)] pt-24 pb-20">
      <div className="mx-auto max-w-7xl px-6">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-block px-4 py-2 bg-[var(--primary)]/10 rounded-full mb-4">
            <span className="text-[var(--primary)] text-sm font-bold">ما يميزنا</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-[var(--primary)]">
            لماذا تختار أكاديمية E.L.A؟
          </h1>
          <div className="mx-auto mt-4 h-1 w-20 rounded-full bg-[var(--primary-light)]" />
          <p className="mx-auto mt-6 max-w-2xl text-[var(--text-gray)] leading-8">
            نجمع بين أحدث أساليب التعليم والتقنية المتطورة لنقدم لك تجربة تعلم فريدة
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <div key={i} className="bg-white rounded-2xl p-7 border border-gray-100 hover:shadow-lg hover:border-[var(--primary-light)]/30 transition-all duration-300 group hover:-translate-y-1">
              <div className="w-12 h-12 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center text-2xl mb-4 group-hover:bg-[var(--primary)] group-hover:text-white transition-all duration-300">
                {f.icon}
              </div>
              <h3 className="text-lg font-bold text-[var(--primary)] mb-2">{f.title}</h3>
              <p className="text-[var(--text-gray)] text-sm leading-7">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}