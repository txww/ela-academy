import Image from "next/image";

const staff = [
  { name: "سيتم الإعلان قريباً", title: "مدرس اللغة الإنجليزية", image: "/staff/placeholder.jpg" },
];

export default function StaffPage() {
  return (
    <main className="min-h-screen bg-[var(--soft-white)] pt-24 pb-20">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center mb-16">
          <div className="inline-block px-4 py-2 bg-[var(--primary)]/10 rounded-full mb-4">
            <span className="text-[var(--primary)] text-sm font-bold">فريقنا</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-[var(--primary)]">
            الكادر التدريسي
          </h1>
          <div className="mx-auto mt-4 h-1 w-20 rounded-full bg-[var(--primary-light)]" />
          <p className="mx-auto mt-6 max-w-2xl text-[var(--text-gray)] leading-8">
            نخبة من المدرسين المتخصصين في تعليم اللغة الإنجليزية بأساليب حديثة وفعّالة
          </p>
        </div>

        {/* Placeholder message */}
        <div className="bg-white rounded-2xl p-12 text-center border border-gray-100 max-w-lg mx-auto">
          <div className="w-20 h-20 rounded-full bg-[var(--primary)]/10 flex items-center justify-center mx-auto mb-5">
            <span className="text-3xl">👨‍🏫</span>
          </div>
          <h3 className="text-xl font-bold text-[var(--primary)] mb-3">سيتم الإعلان عن الكادر قريباً</h3>
          <p className="text-[var(--text-gray)] text-sm leading-7">
            نعمل حالياً على تجهيز فريق التدريس المتميز. ترقبوا الإعلان عن المدرسين المتخصصين قريباً!
          </p>
        </div>
      </div>
    </main>
  );
}