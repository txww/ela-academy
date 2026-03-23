export default function RegulationsPage() {
  const chapters = [
    {
      title: "الفصل الأول: الإطار التعليمي",
      articles: [
        {
          name: "المادة (1): القبول والتسجيل",
          points: [
            "يمر المتقدم باختبار تحديد مستوى إلكتروني لتحديد المستوى المناسب",
            "يُشترط الالتزام بتعبئة نموذج التسجيل بشكل كامل وصحيح",
            "تحتفظ الأكاديمية بحق قبول أو رفض طلبات التسجيل",
          ],
        },
        {
          name: "المادة (2): نمط الدراسة",
          points: [
            "تعتمد الدراسة على نظام التعليم الإلكتروني عبر منصة Zoom",
            "يُوزَّع البرنامج على 5 أيام أسبوعياً",
            "يتابع الطالب بين 4 إلى 6 محاضرات أسبوعياً",
            "يلتزم الطالب بتنفيذ الواجبات والتمارين المرتبطة بكل درس",
            "تُعقد جلسات محادثة تفاعلية بمعدل جلستين أسبوعياً",
            "لا يتجاوز الزمن اليومي المتوقع ساعتين",
            "يتمتع الطالب بحرية مشاهدة الدروس المسجلة في أي وقت",
          ],
        },
        {
          name: "المادة (3): متطلبات النجاح",
          points: [
            "متابعة الدروس وإنجاز الواجبات تشكل 25% من التقييم",
            "الاختبارات المرحلية تشكل 50% من التقييم النهائي",
            "جلسات المحادثة والمشاركة تمثل 15% من التقييم",
            "المشروع التطبيقي يمثل 10% من التقييم",
            "يُعد الطالب مجتازاً للمستوى إذا حقق 60% على الأقل",
          ],
        },
      ],
    },
    {
      title: "الفصل الثاني: الضبط الأكاديمي",
      articles: [
        {
          name: "المادة (4): التنبيه الأكاديمي",
          points: [
            "يُوجَّه تنبيه أكاديمي للطالب في حال مضي أسبوعين دون تقدم دراسي ملموس",
          ],
        },
        {
          name: "المادة (5): إيقاف القيد",
          points: [
            "استمرار التقصير بعد التنبيه لمدة أسبوعين إضافيين",
            "تسريب أو نشر المحتوى التعليمي بأي وسيلة",
            "الإخلال بالآداب العامة أو الإساءة للمدرسين أو الزملاء",
          ],
        },
        {
          name: "المادة (6): استعادة القيد",
          points: [
            "يحق للطالب التقدم بطلب استعادة القيد مع الالتزام بعدم تكرار المخالفة",
            "يُشترط تعويض ما فاته من دروس واختبارات",
            "تعود صلاحية القبول أو الرفض لإدارة الأكاديمية",
          ],
        },
      ],
    },
    {
      title: "الفصل الثالث: التقويم والتفاعل",
      articles: [
        {
          name: "المادة (7): نظام التقييم",
          points: [
            "تُجرى جميع الاختبارات عبر المنصة الإلكترونية",
            "تعتمد الاختبارات على أسئلة متنوعة (اختيار من متعدد، كتابة، استماع)",
            "يُمنح الطالب فرصة إعادة واحدة في نهاية المستوى بحد أعلى 75%",
          ],
        },
        {
          name: "المادة (8): آلية الاستفسارات",
          points: [
            "توفر الأكاديمية قناة مخصصة للاستفسارات الأكاديمية",
            "يلتزم الطالب بمراجعة الأسئلة السابقة قبل طرح سؤال جديد",
            "تُرفع الشكاوى والملاحظات عبر القنوات الرسمية فقط",
          ],
        },
      ],
    },
  ];

  return (
    <main className="min-h-screen bg-[var(--soft-white)] pt-24 pb-20">
      <div className="mx-auto max-w-4xl px-6">
        <div className="text-center mb-16">
          <div className="inline-block px-4 py-2 bg-[var(--primary)]/10 rounded-full mb-4">
            <span className="text-[var(--primary)] text-sm font-bold">الأنظمة</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-[var(--primary)]">
            اللوائح والأنظمة
          </h1>
          <div className="mx-auto mt-4 h-1 w-20 rounded-full bg-[var(--primary-light)]" />
          <p className="mx-auto mt-6 max-w-2xl text-[var(--text-gray)] leading-8">
            اللوائح الإدارية لأكاديمية E.L.A لتعليم اللغة الإنجليزية
          </p>
        </div>

        <div className="space-y-8">
          {chapters.map((ch, ci) => (
            <div key={ci} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="bg-[var(--primary)] px-6 py-4">
                <h2 className="text-lg font-bold text-white">{ch.title}</h2>
              </div>
              <div className="p-6 space-y-6">
                {ch.articles.map((art, ai) => (
                  <div key={ai}>
                    <h3 className="text-base font-bold text-[var(--primary)] mb-3 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[var(--primary-light)]" />
                      {art.name}
                    </h3>
                    <ul className="space-y-2 mr-4">
                      {art.points.map((p, pi) => (
                        <li key={pi} className="text-sm text-[var(--text-gray)] leading-7 flex gap-2">
                          <span className="text-[var(--primary-light)] mt-1 flex-shrink-0">•</span>
                          {p}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}