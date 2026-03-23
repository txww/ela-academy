"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { clearSession } from "@/lib/auth";

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || "http://localhost:1337";

const yearMap: Record<string, string> = {
  all: "جميع المستويات", year1: "A1 — مبتدئ", year2: "A2 — ما قبل المتوسط",
  year3: "B1 — متوسط", year4: "B2-C1 — متقدم",
};

interface ZoomSession {
  id: number; documentId?: string; title: string; date: string;
  zoomLink: string; academicYear?: string; isActive?: boolean;
}

interface Student {
  id: number; email: string; firstName?: string; lastName?: string;
  phone?: string; registrationStatus?: string; academicYear?: string; telegram?: string;
}

interface TeacherInfo {
  email: string; firstName?: string; lastName?: string;
  isTeacher?: boolean; teacherYear?: string; teacherSubject?: string;
}

export default function TeacherPage() {
  const router = useRouter();
  const [teacher, setTeacher] = useState<TeacherInfo | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [sessions, setSessions] = useState<ZoomSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("students");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [search, setSearch] = useState("");

  // Session form
  const [sessionForm, setSessionForm] = useState({ title: "", date: "", zoomLink: "" });
  const [sessionMsg, setSessionMsg] = useState("");

  useEffect(() => {
    const jwt = localStorage.getItem("jwt");
    if (!jwt) { router.push("/login"); return; }

    fetch(`${STRAPI_URL}/api/users/me`, { headers: { Authorization: `Bearer ${jwt}` } })
      .then(r => r.json())
      .then(u => {
        if (!u?.isTeacher) { router.push("/login"); return; }
        setTeacher(u);
        fetchData(jwt, u.teacherYear);
      })
      .catch(() => router.push("/login"));
  }, [router]);

  const fetchData = async (jwt: string, year?: string) => {
    const [studentsRes, sessionsRes] = await Promise.all([
      fetch(`${STRAPI_URL}/api/users?populate=*`, { headers: { Authorization: `Bearer ${jwt}` } }),
      fetch(`${STRAPI_URL}/api/zoom-sessions?sort=date:asc`, { headers: { Authorization: `Bearer ${jwt}` } }),
    ]);
    const studentsData = await studentsRes.json();
    const sessionsData = await sessionsRes.json();

    const allStudents = Array.isArray(studentsData) ? studentsData : [];
    setStudents(allStudents.filter((s: Student) =>
      s.registrationStatus === "approved" && (!year || year === "all" || s.academicYear === year)
    ));

    setSessions(
      Array.isArray(sessionsData?.data)
        ? sessionsData.data.filter((s: ZoomSession) => !year || year === "all" || s.academicYear === year)
        : []
    );
    setLoading(false);
  };

  const addSession = async () => {
    if (!sessionForm.title || !sessionForm.date) { setSessionMsg("يرجى ملء العنوان والتاريخ"); return; }
    const jwt = localStorage.getItem("jwt") || "";
    setSessionMsg("");
    try {
      const res = await fetch(`${STRAPI_URL}/api/zoom-sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` },
        body: JSON.stringify({
          data: {
            title: sessionForm.title, date: sessionForm.date,
            zoomLink: sessionForm.zoomLink, academicYear: teacher?.teacherYear || "year1", isActive: true,
          }
        }),
      });
      if (res.ok) {
        setSessionMsg("✅ تم إضافة الجلسة بنجاح!");
        setSessionForm({ title: "", date: "", zoomLink: "" });
        fetchData(jwt, teacher?.teacherYear);
      } else { setSessionMsg("خطأ في إضافة الجلسة"); }
    } catch { setSessionMsg("تعذّر الاتصال"); }
  };

  const handleLogout = () => { clearSession(); router.push("/"); };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--soft-white)]">
      <div className="w-10 h-10 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const filteredStudents = students.filter(s => {
    const name = `${s.firstName || ""} ${s.lastName || ""} ${s.email}`.toLowerCase();
    return !search || name.includes(search.toLowerCase());
  });

  const tabs = [
    { id: "students", label: "الطلاب", icon: "🎓" },
    { id: "sessions", label: "الجلسات", icon: "📹" },
    { id: "add-session", label: "إضافة جلسة", icon: "➕" },
  ];

  return (
    <div className="min-h-screen bg-[var(--soft-white)] flex pt-16">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 right-0 z-40 w-64 bg-[var(--primary-dark)] text-white transform transition-transform duration-300 md:translate-x-0 md:static md:pt-0 pt-16 ${sidebarOpen ? "translate-x-0" : "translate-x-full md:translate-x-0"}`}>
        <div className="p-6 border-b border-white/10">
          <div className="w-14 h-14 rounded-full bg-[var(--primary-light)] flex items-center justify-center text-xl font-bold mb-3">
            {(teacher?.firstName || "T")[0]?.toUpperCase()}
          </div>
          <h3 className="font-bold text-sm">{teacher?.firstName} {teacher?.lastName}</h3>
          <p className="text-blue-200/60 text-xs mt-1">{teacher?.teacherSubject || "مدرس"}</p>
          <p className="text-blue-200/40 text-xs mt-1">{yearMap[teacher?.teacherYear || ""] || ""}</p>
        </div>

        <div className="p-4 border-b border-white/10 space-y-2">
          <div className="flex justify-between text-xs"><span className="text-blue-200/60">طلابي</span><span className="font-bold">{students.length}</span></div>
          <div className="flex justify-between text-xs"><span className="text-blue-200/60">جلساتي</span><span className="font-bold">{sessions.length}</span></div>
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

      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Main */}
      <main className="flex-1 p-6 md:p-8">
        <button onClick={() => setSidebarOpen(true)} className="md:hidden mb-4 p-2 bg-white rounded-lg shadow-sm">
          <svg className="w-6 h-6 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Students */}
        {activeTab === "students" && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-[var(--primary)]">🎓 طلابي</h2>
              <span className="text-sm text-[var(--text-gray)]">({filteredStudents.length} طالب)</span>
            </div>
            <input placeholder="بحث..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full md:w-80 px-4 py-2 border border-gray-200 rounded-lg text-sm bg-white" />
            <div className="space-y-3">
              {filteredStudents.map(s => (
                <div key={s.id} className="bg-white rounded-xl p-4 border border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[var(--primary)]/10 flex items-center justify-center text-xs font-bold text-[var(--primary)]">
                      {(s.firstName || s.email)[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-sm text-[var(--text-dark)]">{s.firstName} {s.lastName}</p>
                      <p className="text-xs text-[var(--text-gray)]">{s.email} • {s.telegram || ""}</p>
                    </div>
                  </div>
                </div>
              ))}
              {filteredStudents.length === 0 && <p className="text-center text-[var(--text-gray)] py-8">لا يوجد طلاب</p>}
            </div>
          </div>
        )}

        {/* Sessions */}
        {activeTab === "sessions" && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-[var(--primary)]">📹 الجلسات</h2>
            <div className="space-y-3">
              {sessions.map(s => (
                <div key={s.id} className="bg-white rounded-xl p-5 border border-gray-100 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-[var(--text-dark)]">{s.title}</h3>
                    <p className="text-sm text-[var(--text-gray)]">{new Date(s.date).toLocaleString("ar")}</p>
                  </div>
                  {s.zoomLink && <a href={s.zoomLink} target="_blank" rel="noreferrer"
                    className="px-3 py-1 bg-[var(--primary)] text-white text-xs rounded-lg font-bold">🔗 الرابط</a>}
                </div>
              ))}
              {sessions.length === 0 && <p className="text-center text-[var(--text-gray)] py-8">لا توجد جلسات بعد</p>}
            </div>
          </div>
        )}

        {/* Add Session */}
        {activeTab === "add-session" && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-[var(--primary)]">➕ إضافة جلسة جديدة</h2>
            <div className="bg-white rounded-xl p-6 border border-gray-100 max-w-lg">
              {sessionMsg && <div className={`mb-4 p-3 rounded-lg text-sm ${sessionMsg.includes("✅") ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"}`}>{sessionMsg}</div>}
              <div className="space-y-4">
                <input placeholder="عنوان الجلسة *" value={sessionForm.title} onChange={e => setSessionForm({...sessionForm, title: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-[var(--primary-light)]" />
                <input type="datetime-local" value={sessionForm.date} onChange={e => setSessionForm({...sessionForm, date: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-[var(--primary-light)]" />
                <input placeholder="رابط Zoom" value={sessionForm.zoomLink} onChange={e => setSessionForm({...sessionForm, zoomLink: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-[var(--primary-light)]" />
                <p className="text-xs text-[var(--text-gray)]">المستوى: {yearMap[teacher?.teacherYear || ""] || "—"} (يُحدد تلقائياً)</p>
                <button onClick={addSession} className="w-full bg-[var(--primary)] text-white py-3 rounded-xl font-bold hover:bg-[var(--primary-dark)] transition">
                  إضافة الجلسة ✓
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}