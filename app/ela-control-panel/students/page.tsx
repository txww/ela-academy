"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { clearSession } from "@/lib/auth";

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || "http://localhost:1337";
const ADMIN_EMAIL = "admin@ela.com";

interface Student {
  id: number; email: string; firstName?: string; lastName?: string; phone?: string;
  gender?: string; nationality?: string; residenceCountry?: string; telegram?: string;
  registrationStatus?: string; academicYear?: string; birthDate?: string;
  educationLevel?: string; isTeacher?: boolean; teacherYear?: string; teacherSubject?: string;
  createdAt?: string;
}

const yearMap: Record<string, string> = {
  year1: "A1 — مبتدئ", year2: "A2 — ما قبل المتوسط",
  year3: "B1 — متوسط", year4: "B2-C1 — متقدم",
};

const getJwt = () => localStorage.getItem("jwt") || "";

export default function AdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<Student[]>([]);
  const [activeTab, setActiveTab] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterYear, setFilterYear] = useState("all");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // Teacher form
  const [teacherForm, setTeacherForm] = useState({ firstName: "", lastName: "", email: "", password: "", teacherYear: "year1", teacherSubject: "" });
  const [teacherMsg, setTeacherMsg] = useState("");

  useEffect(() => {
    const jwt = getJwt();
    if (!jwt) { router.push("/login"); return; }
    fetch(`${STRAPI_URL}/api/users/me`, { headers: { Authorization: `Bearer ${jwt}` } })
      .then(r => r.json())
      .then(u => {
        if (u?.email !== ADMIN_EMAIL) { router.push("/login"); return; }
        fetchStudents();
      })
      .catch(() => router.push("/login"));
  }, [router]);

  const fetchStudents = async () => {
    setLoading(true);
    const res = await fetch(`${STRAPI_URL}/api/users?populate=*`, { headers: { Authorization: `Bearer ${getJwt()}` } });
    const data = await res.json();
    setStudents(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  const updateStudent = async (id: number, updates: Record<string, unknown>) => {
    await fetch(`${STRAPI_URL}/api/users/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${getJwt()}` },
      body: JSON.stringify(updates),
    });

    // Send notification
    const student = students.find(s => s.id === id);
    if (student && updates.registrationStatus) {
      const status = updates.registrationStatus as string;
      try {
        await fetch("/api/notify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "both",
            telegramMessage: `${status === "approved" ? "✅" : "❌"} تم ${status === "approved" ? "قبول" : "رفض"} الطالب: ${student.firstName || ""} ${student.lastName || ""} (${student.email})`,
            emailTo: student.email,
            emailSubject: status === "approved" ? "مبروك! تم قبولك في أكاديمية E.L.A" : "نتيجة طلب التسجيل — أكاديمية E.L.A",
            emailBody: status === "approved"
              ? `<div dir="rtl"><h2 style="color:#1B2A6B">مرحباً ${student.firstName || ""}</h2><p>يسعدنا إبلاغك بقبولك في أكاديمية E.L.A لتعليم اللغة الإنجليزية!</p><p>يمكنك الآن الدخول للوحة التحكم ومتابعة دروسك.</p><p>— فريق E.L.A Academy</p></div>`
              : `<div dir="rtl"><h2 style="color:#1B2A6B">مرحباً ${student.firstName || ""}</h2><p>نأسف لإبلاغك بأن طلب تسجيلك لم يُقبل. تواصل معنا لمزيد من المعلومات.</p><p>— فريق E.L.A Academy</p></div>`,
            jwt: getJwt(),
          }),
        });
      } catch { /* silent */ }
    }

    fetchStudents();
  };

  const addTeacher = async () => {
    if (!teacherForm.firstName || !teacherForm.email || !teacherForm.password) {
      setTeacherMsg("يرجى ملء جميع الحقول المطلوبة"); return;
    }
    setTeacherMsg("");
    try {
      const regRes = await fetch(`${STRAPI_URL}/api/auth/local/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: teacherForm.email, email: teacherForm.email, password: teacherForm.password }),
      });
      const regData = await regRes.json();
      if (!regRes.ok) { setTeacherMsg(regData?.error?.message || "خطأ في إنشاء الحساب"); return; }

      await fetch(`${STRAPI_URL}/api/users/${regData.user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getJwt()}` },
        body: JSON.stringify({
          firstName: teacherForm.firstName, lastName: teacherForm.lastName,
          isTeacher: true, teacherYear: teacherForm.teacherYear, teacherSubject: teacherForm.teacherSubject,
          registrationStatus: "approved",
        }),
      });

      setTeacherMsg("✅ تم إنشاء حساب المدرس بنجاح!");
      setTeacherForm({ firstName: "", lastName: "", email: "", password: "", teacherYear: "year1", teacherSubject: "" });
      fetchStudents();
    } catch { setTeacherMsg("تعذّر الاتصال بالخادم"); }
  };

  const handleLogout = () => { clearSession(); router.push("/"); };

  const realStudents = students.filter(s => !s.isTeacher && s.email !== ADMIN_EMAIL);
  const teachers = students.filter(s => s.isTeacher);
  const filtered = realStudents.filter(s => {
    const name = `${s.firstName || ""} ${s.lastName || ""} ${s.email}`.toLowerCase();
    if (search && !name.includes(search.toLowerCase())) return false;
    if (filterStatus !== "all" && s.registrationStatus !== filterStatus) return false;
    if (filterYear !== "all" && s.academicYear !== filterYear) return false;
    return true;
  });

  const pending = realStudents.filter(s => s.registrationStatus === "pending").length;
  const approved = realStudents.filter(s => s.registrationStatus === "approved").length;

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--soft-white)]">
      <div className="w-10 h-10 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const tabs = [
    { id: "overview", label: "نظرة عامة", icon: "📊" },
    { id: "students", label: "الطلاب", icon: "🎓", badge: pending },
    { id: "teachers", label: "المدرسون", icon: "👨‍🏫" },
  ];

  // CSV Export
  const exportCSV = () => {
    const bom = "\uFEFF";
    const header = "الاسم,البريد,الهاتف,الجنسية,بلد الإقامة,المستوى,الحالة\n";
    const rows = filtered.map(s =>
      `"${s.firstName || ""} ${s.lastName || ""}","${s.email}","${s.phone || ""}","${s.nationality || ""}","${s.residenceCountry || ""}","${yearMap[s.academicYear || ""] || "-"}","${s.registrationStatus || ""}"`
    ).join("\n");
    const blob = new Blob([bom + header + rows], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `students_ela_${new Date().toLocaleDateString("ar")}.csv`;
    link.click();
  };

  return (
    <div className="min-h-screen bg-[var(--soft-white)] flex pt-16">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 right-0 z-40 w-64 bg-[var(--primary-dark)] text-white transform transition-transform duration-300 md:translate-x-0 md:static md:pt-0 pt-16 ${sidebarOpen ? "translate-x-0" : "translate-x-full md:translate-x-0"}`}>
        <div className="p-6 border-b border-white/10">
          <h3 className="font-bold text-lg">🏛️ لوحة الإدارة</h3>
          <p className="text-blue-200/60 text-xs mt-1">E.L.A Academy</p>
        </div>

        <div className="p-4 border-b border-white/10 space-y-2">
          <div className="flex justify-between text-xs"><span className="text-blue-200/60">إجمالي الطلاب</span><span className="font-bold">{realStudents.length}</span></div>
          <div className="flex justify-between text-xs"><span className="text-amber-300">⏳ بانتظار</span><span className="font-bold">{pending}</span></div>
          <div className="flex justify-between text-xs"><span className="text-green-300">✅ مقبول</span><span className="font-bold">{approved}</span></div>
          <div className="flex justify-between text-xs"><span className="text-blue-200/60">👨‍🏫 مدرسون</span><span className="font-bold">{teachers.length}</span></div>
        </div>

        <nav className="p-4 space-y-1">
          {tabs.map(t => (
            <button key={t.id} onClick={() => { setActiveTab(t.id); setSidebarOpen(false); }}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition ${
                activeTab === t.id ? "bg-white/10 text-white" : "text-blue-200/60 hover:text-white hover:bg-white/5"
              }`}>
              <span className="flex items-center gap-3"><span>{t.icon}</span>{t.label}</span>
              {t.badge ? <span className="bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{t.badge}</span> : null}
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

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-[var(--primary)]">📊 نظرة عامة</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "إجمالي الطلاب", value: realStudents.length, color: "text-[var(--primary)]" },
                { label: "بانتظار القبول", value: pending, color: "text-amber-600" },
                { label: "مقبولون", value: approved, color: "text-green-600" },
                { label: "مدرسون", value: teachers.length, color: "text-purple-600" },
              ].map((s, i) => (
                <div key={i} className="bg-white rounded-xl p-5 border border-gray-100">
                  <p className="text-[var(--text-gray)] text-xs">{s.label}</p>
                  <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
                </div>
              ))}
            </div>

            {/* Recent registrations */}
            <div className="bg-white rounded-xl border border-gray-100 p-6">
              <h3 className="font-bold text-[var(--primary)] mb-4">آخر المسجلين</h3>
              <div className="space-y-3">
                {realStudents.slice(-5).reverse().map(s => (
                  <div key={s.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[var(--primary)]/10 flex items-center justify-center text-xs font-bold text-[var(--primary)]">
                        {(s.firstName || s.email)[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[var(--text-dark)]">{s.firstName} {s.lastName}</p>
                        <p className="text-xs text-[var(--text-gray)]">{s.email}</p>
                      </div>
                    </div>
                    {s.registrationStatus === "pending" && (
                      <button onClick={() => updateStudent(s.id, { registrationStatus: "approved" })}
                        className="px-3 py-1 bg-green-500 text-white text-xs rounded-lg font-bold hover:bg-green-600 transition">
                        قبول ✓
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Students Tab */}
        {activeTab === "students" && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-xl font-bold text-[var(--primary)]">🎓 الطلاب</h2>
              <div className="flex-1" />
              <button onClick={exportCSV} className="px-4 py-2 bg-green-500 text-white text-sm rounded-lg font-bold hover:bg-green-600 transition">
                📥 تصدير Excel
              </button>
            </div>

            <div className="flex flex-wrap gap-3">
              <input placeholder="بحث..." value={search} onChange={e => setSearch(e.target.value)}
                className="px-4 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-[var(--primary-light)] flex-1 min-w-[200px]" />
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white">
                <option value="all">كل الحالات</option>
                <option value="pending">قيد المراجعة</option>
                <option value="approved">مقبول</option>
                <option value="rejected">مرفوض</option>
              </select>
              <select value={filterYear} onChange={e => setFilterYear(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white">
                <option value="all">كل المستويات</option>
                {Object.entries(yearMap).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>

            <div className="space-y-3">
              {filtered.map(s => (
                <div key={s.id} className="bg-white rounded-xl p-5 border border-gray-100 hover:shadow-sm transition">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[var(--primary)]/10 flex items-center justify-center font-bold text-[var(--primary)]">
                        {(s.firstName || s.email)[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-[var(--text-dark)]">{s.firstName} {s.lastName}</p>
                        <p className="text-xs text-[var(--text-gray)]">{s.email} • {s.phone || "—"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <select value={s.academicYear || ""} onChange={e => updateStudent(s.id, { academicYear: e.target.value })}
                        className="px-2 py-1 border border-gray-200 rounded text-xs bg-white">
                        <option value="">المستوى</option>
                        {Object.entries(yearMap).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                      {s.registrationStatus === "pending" && (
                        <>
                          <button onClick={() => updateStudent(s.id, { registrationStatus: "approved" })}
                            className="px-3 py-1 bg-green-500 text-white text-xs rounded-lg font-bold">✓ قبول</button>
                          <button onClick={() => updateStudent(s.id, { registrationStatus: "rejected" })}
                            className="px-3 py-1 bg-red-500 text-white text-xs rounded-lg font-bold">✗ رفض</button>
                        </>
                      )}
                      {s.registrationStatus === "approved" && <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full font-bold">مقبول ✓</span>}
                      {s.registrationStatus === "rejected" && <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full font-bold">مرفوض ✗</span>}
                      <button onClick={() => setSelectedStudent(selectedStudent?.id === s.id ? null : s)}
                        className="px-2 py-1 text-[var(--primary)] text-xs hover:bg-blue-50 rounded">تفاصيل</button>
                    </div>
                  </div>
                  {selectedStudent?.id === s.id && (
                    <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div><span className="text-[var(--text-gray)] text-xs">الجنسية</span><p className="font-medium">{s.nationality || "—"}</p></div>
                      <div><span className="text-[var(--text-gray)] text-xs">بلد الإقامة</span><p className="font-medium">{s.residenceCountry || "—"}</p></div>
                      <div><span className="text-[var(--text-gray)] text-xs">تلقرام</span><p className="font-medium">{s.telegram || "—"}</p></div>
                      <div><span className="text-[var(--text-gray)] text-xs">التعليم</span><p className="font-medium">{s.educationLevel || "—"}</p></div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Teachers Tab */}
        {activeTab === "teachers" && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-[var(--primary)]">👨‍🏫 إدارة المدرسين</h2>

            {/* Add Teacher Form */}
            <div className="bg-white rounded-xl p-6 border border-gray-100">
              <h3 className="font-bold text-[var(--primary)] mb-4">إضافة مدرس جديد</h3>
              {teacherMsg && <div className={`mb-4 p-3 rounded-lg text-sm ${teacherMsg.includes("✅") ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"}`}>{teacherMsg}</div>}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input placeholder="الاسم الأول *" value={teacherForm.firstName} onChange={e => setTeacherForm({...teacherForm, firstName: e.target.value})}
                  className="px-4 py-3 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-[var(--primary-light)]" />
                <input placeholder="اسم العائلة" value={teacherForm.lastName} onChange={e => setTeacherForm({...teacherForm, lastName: e.target.value})}
                  className="px-4 py-3 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-[var(--primary-light)]" />
                <input placeholder="البريد الإلكتروني *" type="email" value={teacherForm.email} onChange={e => setTeacherForm({...teacherForm, email: e.target.value})}
                  className="px-4 py-3 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-[var(--primary-light)]" />
                <input placeholder="كلمة المرور *" type="password" value={teacherForm.password} onChange={e => setTeacherForm({...teacherForm, password: e.target.value})}
                  className="px-4 py-3 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-[var(--primary-light)]" />
                <select value={teacherForm.teacherYear} onChange={e => setTeacherForm({...teacherForm, teacherYear: e.target.value})}
                  className="px-4 py-3 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-[var(--primary-light)]">
                  {Object.entries(yearMap).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                <input placeholder="المادة / التخصص" value={teacherForm.teacherSubject} onChange={e => setTeacherForm({...teacherForm, teacherSubject: e.target.value})}
                  className="px-4 py-3 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-[var(--primary-light)]" />
              </div>
              <button onClick={addTeacher} className="mt-4 px-6 py-3 bg-[var(--primary)] text-white rounded-xl font-bold hover:bg-[var(--primary-dark)] transition">
                ➕ إضافة مدرس
              </button>
            </div>

            {/* Teachers List */}
            <div className="space-y-3">
              {teachers.map(t => (
                <div key={t.id} className="bg-white rounded-xl p-5 border border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center font-bold text-purple-600">
                      {(t.firstName || t.email)[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-[var(--text-dark)]">{t.firstName} {t.lastName}</p>
                      <p className="text-xs text-[var(--text-gray)]">{t.email} • {t.teacherSubject || "—"} • {yearMap[t.teacherYear || ""] || "—"}</p>
                    </div>
                  </div>
                </div>
              ))}
              {teachers.length === 0 && <p className="text-center text-[var(--text-gray)] py-8">لا يوجد مدرسون بعد</p>}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}