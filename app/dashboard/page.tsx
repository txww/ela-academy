"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { clearSession } from "@/lib/auth";

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || "http://localhost:1337";

interface User {
  id: number; email: string; firstName?: string; lastName?: string; phone?: string;
  gender?: string; nationality?: string; residenceCountry?: string; telegram?: string;
  registrationStatus?: string; academicYear?: string;
}

interface ZoomSession {
  id: number; title: string; date: string; zoomLink: string; academicYear?: string; isActive?: boolean;
}

const statusConfig: Record<string, { label: string; color: string; bg: string; icon: string; message: string }> = {
  pending: { label: "قيد المراجعة", color: "text-amber-600", bg: "bg-amber-50 border-amber-200", icon: "⏳", message: "طلب تسجيلك قيد المراجعة من قبل الإدارة. سيتم إبلاغك بالنتيجة قريباً." },
  approved: { label: "مقبول", color: "text-green-600", bg: "bg-green-50 border-green-200", icon: "🎉", message: "مرحباً بك في أكاديمية E.L.A! تم قبول تسجيلك بنجاح." },
  rejected: { label: "مرفوض", color: "text-red-600", bg: "bg-red-50 border-red-200", icon: "❌", message: "للأسف لم يتم قبول تسجيلك. تواصل مع الإدارة لمزيد من المعلومات." },
};

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [sessions, setSessions] = useState<ZoomSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    const jwt = localStorage.getItem("jwt");
    if (!jwt) { router.push("/login"); return; }

    Promise.all([
      fetch(`${STRAPI_URL}/api/users/me`, { headers: { Authorization: `Bearer ${jwt}` } }).then(r => r.json()),
      fetch(`${STRAPI_URL}/api/zoom-sessions?sort=date:asc`, { headers: { Authorization: `Bearer ${jwt}` } }).then(r => r.json()),
    ]).then(([userData, sessionsData]) => {
      if (!userData?.id) { router.push("/login"); return; }
      setUser(userData);
      setSessions(
        Array.isArray(sessionsData?.data)
          ? sessionsData.data.filter((s: ZoomSession) => s.isActive !== false && (!s.academicYear || s.academicYear === userData.academicYear))
          : []
      );
      setLoading(false);
    }).catch(() => { router.push("/login"); });
  }, [router]);

  const handleLogout = () => { clearSession(); router.push("/"); };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--soft-white)]">
      <div className="w-10 h-10 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!user) return null;
  const status = statusConfig[user.registrationStatus || "pending"];
  const fullName = `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email;

  const tabs = [
    { id: "overview", label: "نظرة عامة", icon: "📊" },
    { id: "sessions", label: "الجلسات", icon: "📹" },
    { id: "profile", label: "بياناتي", icon: "👤" },
  ];

  return (
    <div className="min-h-screen bg-[var(--soft-white)] flex pt-16">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 right-0 z-40 w-64 bg-[var(--primary-dark)] text-white transform transition-transform duration-300 md:translate-x-0 md:static md:pt-0 pt-16 ${sidebarOpen ? "translate-x-0" : "translate-x-full md:translate-x-0"}`}>
        <div className="p-6 border-b border-white/10">
          <div className="w-14 h-14 rounded-full bg-[var(--primary-light)] flex items-center justify-center text-xl font-bold mb-3">
            {fullName[0]?.toUpperCase()}
          </div>
          <h3 className="font-bold text-sm">{fullName}</h3>
          <p className="text-blue-200/60 text-xs mt-1">{user.email}</p>
          <span className={`inline-block mt-2 px-3 py-1 rounded-full text-[10px] font-bold ${
            user.registrationStatus === "approved" ? "bg-green-500/20 text-green-300" :
            user.registrationStatus === "rejected" ? "bg-red-500/20 text-red-300" :
            "bg-amber-500/20 text-amber-300"
          }`}>
            {status.icon} {status.label}
          </span>
        </div>

        <nav className="p-4 space-y-1">
          {tabs.map(t => (
            <button key={t.id} onClick={() => { setActiveTab(t.id); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition ${
                activeTab === t.id ? "bg-white/10 text-white" : "text-blue-200/60 hover:text-white hover:bg-white/5"
              }`}>
              <span>{t.icon}</span>{t.label}
            </button>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4">
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-red-300 hover:bg-red-500/10 transition">
            🚪 تسجيل الخروج
          </button>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-8">
        {/* Mobile header */}
        <button onClick={() => setSidebarOpen(true)} className="md:hidden mb-4 p-2 bg-white rounded-lg shadow-sm">
          <svg className="w-6 h-6 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Status Banner */}
        {user.registrationStatus !== "approved" && (
          <div className={`mb-6 p-4 rounded-xl border ${status.bg}`}>
            <p className={`font-bold ${status.color}`}>{status.icon} {status.message}</p>
          </div>
        )}

        {activeTab === "overview" && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-[var(--primary)]">مرحباً {user.firstName || ""} 👋</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-xl p-5 border border-gray-100">
                <p className="text-[var(--text-gray)] text-xs">الحالة</p>
                <p className={`text-lg font-bold mt-1 ${status.color}`}>{status.label}</p>
              </div>
              <div className="bg-white rounded-xl p-5 border border-gray-100">
                <p className="text-[var(--text-gray)] text-xs">الجلسات القادمة</p>
                <p className="text-lg font-bold text-[var(--primary)] mt-1">{sessions.filter(s => new Date(s.date) > new Date()).length}</p>
              </div>
              <div className="bg-white rounded-xl p-5 border border-gray-100">
                <p className="text-[var(--text-gray)] text-xs">المستوى</p>
                <p className="text-lg font-bold text-[var(--primary)] mt-1">{user.academicYear || "لم يُحدد"}</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === "sessions" && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-[var(--primary)]">📹 الجلسات</h2>
            {sessions.length === 0 ? (
              <div className="bg-white rounded-xl p-8 text-center border border-gray-100">
                <p className="text-[var(--text-gray)]">لا توجد جلسات حالياً</p>
              </div>
            ) : sessions.map(s => (
              <div key={s.id} className="bg-white rounded-xl p-5 border border-gray-100 flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-[var(--text-dark)]">{s.title}</h3>
                  <p className="text-sm text-[var(--text-gray)]">{new Date(s.date).toLocaleString("ar")}</p>
                </div>
                {s.zoomLink && (
                  <a href={s.zoomLink} target="_blank" rel="noreferrer"
                    className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg text-sm font-bold hover:bg-[var(--primary-dark)] transition">
                    انضم 🔗
                  </a>
                )}
              </div>
            ))}
          </div>
        )}

        {activeTab === "profile" && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-[var(--primary)]">👤 بياناتي</h2>
            <div className="bg-white rounded-xl p-6 border border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { label: "الاسم", value: fullName },
                { label: "البريد", value: user.email },
                { label: "الهاتف", value: user.phone },
                { label: "الجنسية", value: user.nationality },
                { label: "بلد الإقامة", value: user.residenceCountry },
                { label: "تلقرام", value: user.telegram },
              ].map((f, i) => (
                <div key={i}>
                  <p className="text-xs text-[var(--text-gray)]">{f.label}</p>
                  <p className="font-medium text-[var(--text-dark)]">{f.value || "—"}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}