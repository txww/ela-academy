import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-[var(--primary-dark)] text-white">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid md:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="md:col-span-1">
            <h3 className="text-2xl font-extrabold mb-3">E.L.A</h3>
            <p className="text-blue-200/60 text-sm leading-7">
              Beyond Language – Toward Excellence
            </p>
            <p className="text-blue-200/60 text-sm leading-7 mt-2">
              أكاديمية متخصصة في تعليم اللغة الإنجليزية عبر الإنترنت
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-bold text-blue-200 mb-4">روابط سريعة</h4>
            <ul className="space-y-3">
              {[
                { href: "/", label: "الرئيسية" },
                { href: "/features", label: "المميزات" },
                { href: "/study-plan", label: "الخطة الدراسية" },
                { href: "/staff", label: "المدرسون" },
              ].map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-blue-200/50 hover:text-white text-sm transition">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-bold text-blue-200 mb-4">الأكاديمية</h4>
            <ul className="space-y-3">
              {[
                { href: "/regulations", label: "اللوائح والأنظمة" },
                { href: "/register", label: "التسجيل" },
                { href: "/login", label: "تسجيل الدخول" },
              ].map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-blue-200/50 hover:text-white text-sm transition">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-bold text-blue-200 mb-4">تواصل معنا</h4>
            <ul className="space-y-3 text-sm text-blue-200/50">
              <li>📧 ela.academy3@gmail.com</li>
              <li>🌐 elaacadmy.com</li>
              <li>&#128222 +963 949 360 071</li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-white/10 text-center text-sm text-blue-200/40">
          © {new Date().getFullYear()} E.L.A Academy. جميع الحقوق محفوظة.
        </div>
      </div>
    </footer>
  );
}