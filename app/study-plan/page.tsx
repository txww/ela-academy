"use client";
import { useState } from "react";

const studyPlan = [
  {
    level: "المستوى الأول — A1 (مبتدئ)",
    color: "from-green-400 to-emerald-500",
    semesters: [
      {
        title: "الفصل الأول",
        subjects: [
          { name: "أساسيات القواعد", type: "أساسي", desc: "الأزمنة البسيطة، الأسماء، الضمائر، أدوات التعريف" },
          { name: "المفردات الأساسية", type: "أساسي", desc: "500 كلمة شائعة، التحيات، الأرقام، الألوان، العائلة" },
          { name: "الاستماع والنطق", type: "أساسي", desc: "أصوات الحروف الإنجليزية، التمييز السمعي، النطق الصحيح" },
          { name: "المحادثة البسيطة", type: "تطبيقي", desc: "تقديم النفس، السؤال عن الاتجاهات، المحادثات اليومية" },
        ],
      },
      {
        title: "الفصل الثاني",
        subjects: [
          { name: "القواعد المتقدمة A1", type: "أساسي", desc: "المضارع المستمر، الماضي البسيط، حروف الجر" },
          { name: "القراءة الأولية", type: "أساسي", desc: "قراءة نصوص بسيطة، فهم اللافتات والإعلانات" },
          { name: "الكتابة الأساسية", type: "تطبيقي", desc: "كتابة جمل بسيطة، ملء استمارات، رسائل قصيرة" },
          { name: "مشروع تطبيقي", type: "إثرائي", desc: "تقديم عرض شفهي بسيط عن موضوع شخصي" },
        ],
      },
    ],
  },
  {
    level: "المستوى الثاني — A2 (ما قبل المتوسط)",
    color: "from-teal-400 to-cyan-500",
    semesters: [
      {
        title: "الفصل الأول",
        subjects: [
          { name: "القواعد المتوسطة", type: "أساسي", desc: "الأزمنة المركبة، الجمل الشرطية البسيطة، المبني للمجهول" },
          { name: "توسيع المفردات", type: "أساسي", desc: "1000 كلمة إضافية، التعابير الاصطلاحية الشائعة" },
          { name: "مهارات الاستماع", type: "أساسي", desc: "فهم المحادثات البطيئة، الأخبار المبسطة" },
          { name: "المحادثة التفاعلية", type: "تطبيقي", desc: "حوارات في المطعم، التسوق، السفر" },
        ],
      },
      {
        title: "الفصل الثاني",
        subjects: [
          { name: "القراءة المتوسطة", type: "أساسي", desc: "قصص قصيرة مبسطة، مقالات سهلة" },
          { name: "الكتابة المتوسطة", type: "أساسي", desc: "كتابة فقرات، رسائل إلكترونية، وصف الأحداث" },
          { name: "النطق والتجويد", type: "تطبيقي", desc: "ربط الكلمات، الإيقاع والنبر في الجمل" },
          { name: "اختبار تحديد المستوى", type: "إثرائي", desc: "اختبار شامل للانتقال للمستوى B1" },
        ],
      },
    ],
  },
  {
    level: "المستوى الثالث — B1 (متوسط)",
    color: "from-blue-400 to-indigo-500",
    semesters: [
      {
        title: "الفصل الأول",
        subjects: [
          { name: "القواعد المتقدمة", type: "أساسي", desc: "الجمل الشرطية المتقدمة، الأفعال المركبة، الروابط" },
          { name: "مفردات متخصصة", type: "أساسي", desc: "مفردات الأعمال، التكنولوجيا، الصحة" },
          { name: "الاستماع المتقدم", type: "أساسي", desc: "فهم البودكاست، الأفلام مع ترجمة" },
          { name: "الكتابة الأكاديمية", type: "تطبيقي", desc: "كتابة مقالات قصيرة، تقارير بسيطة" },
        ],
      },
      {
        title: "الفصل الثاني",
        subjects: [
          { name: "المحادثة المتقدمة", type: "أساسي", desc: "مناقشات، عروض تقديمية، مقابلات عمل" },
          { name: "القراءة النقدية", type: "أساسي", desc: "تحليل مقالات، قراءة أخبار حقيقية" },
          { name: "التحضير لـ IELTS/TOEFL", type: "إثرائي", desc: "استراتيجيات الاختبارات الدولية" },
          { name: "مشروع بحثي", type: "تطبيقي", desc: "بحث وعرض تقديمي عن موضوع متخصص" },
        ],
      },
    ],
  },
  {
    level: "المستوى الرابع — B2-C1 (متقدم)",
    color: "from-purple-400 to-violet-500",
    semesters: [
      {
        title: "الفصل الأول",
        subjects: [
          { name: "إتقان القواعد", type: "أساسي", desc: "تراكيب متقدمة، أساليب بلاغية، دقة لغوية" },
          { name: "الطلاقة في المحادثة", type: "أساسي", desc: "مناظرات، حل مشكلات، تفاوض" },
          { name: "الكتابة الاحترافية", type: "أساسي", desc: "كتابة أكاديمية ومهنية متقدمة" },
          { name: "الأدب الإنجليزي", type: "إثرائي", desc: "قراءة روايات وقصص أدبية مختارة" },
        ],
      },
      {
        title: "الفصل الثاني",
        subjects: [
          { name: "اللغة المهنية", type: "أساسي", desc: "إنجليزي الأعمال، المراسلات الرسمية" },
          { name: "اختبارات دولية", type: "تطبيقي", desc: "تدريب مكثف على IELTS / TOEFL" },
          { name: "مشروع التخرج", type: "تطبيقي", desc: "بحث شامل وعرض تقديمي باللغة الإنجليزية" },
          { name: "شهادة الإتمام", type: "إثرائي", desc: "اختبار نهائي شامل وشهادة معتمدة" },
        ],
      },
    ],
  },
];

const typeColors: Record<string, string> = {
  "أساسي": "bg-blue-100 text-blue-700",
  "تطبيقي": "bg-amber-100 text-amber-700",
  "إثرائي": "bg-purple-100 text-purple-700",
};

export default function StudyPlanPage() {
  const [activeLevel, setActiveLevel] = useState(0);

  return (
    <main className="min-h-screen bg-[var(--soft-white)] pt-24 pb-20">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center mb-12">
          <div className="inline-block px-4 py-2 bg-[var(--primary)]/10 rounded-full mb-4">
            <span className="text-[var(--primary)] text-sm font-bold">المنهج الدراسي</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-[var(--primary)]">الخطة الدراسية</h1>
          <div className="mx-auto mt-4 h-1 w-20 rounded-full bg-[var(--primary-light)]" />
          <p className="mx-auto mt-6 max-w-2xl text-[var(--text-gray)] leading-8">
            خطة تعليمية متكاملة من المبتدئ إلى المتقدم مبنية على المعايير الأوروبية (CEFR)
          </p>
        </div>

        {/* Level Tabs */}
        <div className="flex flex-wrap gap-3 justify-center mb-10">
          {studyPlan.map((level, i) => (
            <button
              key={i}
              onClick={() => setActiveLevel(i)}
              className={`px-5 py-3 rounded-xl text-sm font-bold transition-all ${
                activeLevel === i
                  ? "bg-[var(--primary)] text-white shadow-lg"
                  : "bg-white text-[var(--text-gray)] border border-gray-200 hover:border-[var(--primary-light)]"
              }`}
            >
              {level.level.split("—")[0].trim()}
            </button>
          ))}
        </div>

        {/* Active Level Content */}
        <div>
          <h2 className={`text-xl font-bold text-[var(--primary)] mb-6 text-center`}>
            {studyPlan[activeLevel].level}
          </h2>

          <div className="grid md:grid-cols-2 gap-8">
            {studyPlan[activeLevel].semesters.map((sem, si) => (
              <div key={si} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className={`bg-gradient-to-l ${studyPlan[activeLevel].color} px-6 py-4`}>
                  <h3 className="text-lg font-bold text-white">{sem.title}</h3>
                </div>
                <div className="p-6 space-y-4">
                  {sem.subjects.map((sub, subi) => (
                    <div key={subi} className="flex gap-4 p-4 rounded-xl bg-gray-50 hover:bg-blue-50/50 transition">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-bold text-[var(--text-dark)] text-sm">{sub.name}</h4>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${typeColors[sub.type] || "bg-gray-100 text-gray-600"}`}>
                            {sub.type}
                          </span>
                        </div>
                        <p className="text-[var(--text-gray)] text-xs leading-6">{sub.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}