"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || "http://localhost:1337";
const ADMIN_EMAIL = "admin@ela.com";

const navLinks = [
  { href: "/", label: "الرئيسية" },
  { href: "/features", label: "المميزات" },
  { href: "/study-plan", label: "الخطة الدراسية" },
  { href: "/regulations", label: "اللوائح" },
  { href: "/staff", label: "المدرسون" },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState<{ email?: string; firstName?: string; isTeacher?: boolean } | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    const jwt = localStorage.getItem("jwt");
    if (jwt) {
      fetch(`${STRAPI_URL}/api/users/me`, {
        headers: { Authorization: `Bearer ${jwt}` },
      })
        .then((r) => r.json())
        .then((data) => {
          if (data?.id) setUser(data);
        })
        .catch(() => {});
    }
  }, [pathname]);

  const handleLogout = () => {
    localStorage.removeItem("jwt");
    localStorage.removeItem("user");
    document.cookie = "jwt=; path=/; max-age=0";
    setUser(null);
    setDropdownOpen(false);
    router.push("/");
  };

  const getDashboardLink = () => {
    if (!user) return "/login";
    if (user.email === ADMIN_EMAIL) return "/ela-control-panel/students";
    if (user.isTeacher) return "/teacher";
    return "/dashboard";
  };

  const getDashboardLabel = () => {
    if (!user) return "";
    if (user.email === ADMIN_EMAIL) return "🏛️ لوحة الإدارة";
    if (user.isTeacher) return "👨‍🏫 بوابة المدرسين";
    return "🎓 لوحتي";
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md shadow-sm border-b border-gray-100">
      <div className="mx-auto max-w-7xl px-6 flex items-center justify-between h-16">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3">
          <Image src="/logo.png" alt="E.L.A" width={40} height={40} className="object-contain" />
          <span className="text-xl font-extrabold text-[var(--primary)]">E.L.A</span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                pathname === link.href
                  ? "bg-[var(--primary)] text-white"
                  : "text-[var(--text-gray)] hover:text-[var(--primary)] hover:bg-blue-50"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Auth Buttons */}
        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-50 text-[var(--primary)] font-medium text-sm hover:bg-blue-100 transition"
              >
                <span className="w-7 h-7 rounded-full bg-[var(--primary)] text-white flex items-center justify-center text-xs font-bold">
                  {(user.firstName || user.email || "U")[0].toUpperCase()}
                </span>
                {user.firstName || user.email?.split("@")[0]}
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {dropdownOpen && (
                <div className="absolute left-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50">
                  <Link
                    href={getDashboardLink()}
                    className="block px-4 py-2 text-sm text-[var(--text-dark)] hover:bg-blue-50 transition"
                    onClick={() => setDropdownOpen(false)}
                  >
                    {getDashboardLabel()}
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full text-right px-4 py-2 text-sm text-red-500 hover:bg-red-50 transition"
                  >
                    تسجيل الخروج
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link href="/login" className="px-4 py-2 text-sm font-medium text-[var(--primary)] hover:bg-blue-50 rounded-lg transition">
                دخول
              </Link>
              <Link href="/register" className="px-5 py-2 text-sm font-bold bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-dark)] transition shadow-sm">
                سجّل الآن
              </Link>
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden p-2">
          <svg className="w-6 h-6 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d={menuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
          </svg>
        </button>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 px-6 py-4 space-y-2">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className={`block px-4 py-3 rounded-lg text-sm font-medium transition ${
                pathname === link.href
                  ? "bg-[var(--primary)] text-white"
                  : "text-[var(--text-gray)] hover:bg-blue-50"
              }`}
            >
              {link.label}
            </Link>
          ))}
          <div className="pt-3 border-t border-gray-100 space-y-2">
            {user ? (
              <>
                <Link href={getDashboardLink()} onClick={() => setMenuOpen(false)}
                  className="block px-4 py-3 rounded-lg text-sm font-medium text-[var(--primary)] bg-blue-50">
                  {getDashboardLabel()}
                </Link>
                <button onClick={() => { handleLogout(); setMenuOpen(false); }}
                  className="w-full text-right px-4 py-3 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50">
                  تسجيل الخروج
                </button>
              </>
            ) : (
              <>
                <Link href="/login" onClick={() => setMenuOpen(false)}
                  className="block px-4 py-3 rounded-lg text-sm font-medium text-[var(--primary)] hover:bg-blue-50">
                  دخول
                </Link>
                <Link href="/register" onClick={() => setMenuOpen(false)}
                  className="block px-4 py-3 rounded-lg text-sm font-bold bg-[var(--primary)] text-white text-center">
                  سجّل الآن
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}