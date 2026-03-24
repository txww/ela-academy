"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { clearSession } from "@/lib/auth";

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || "http://localhost:1337";
const ADMIN_EMAIL = "admin@ela.com";
const getJwt = () => localStorage.getItem("jwt") || "";

const LEVELS = [
  { value: "intro", label: "Intro (0)" },
  { value: "level1", label: "Level 1" },
  { value: "level2", label: "Level 2" },
  { value: "level3", label: "Level 3" },
  { value: "conversation", label: "Conversation" },
];

const SUB_LEVELS = ["A", "B"];

interface User {
  id: number; email: string; firstName?: string; lastName?: string; phone?: string;
  nationality?: string; residenceCountry?: string; telegram?: string; gender?: string;
  registrationStatus?: string; academicYear?: string; isTeacher?: boolean;
  teacherYear?: string; teacherSubject?: string; birthDate?: string; createdAt?: string;
}

interface Section {
  id: number; name: string; level: string; sub_level: string; teacher_id: number | null;
  max_students: number; is_active: boolean; zoom_link: string | null; schedule: string | null;
}

interface Assignment { id: number; section_id: number; teacher_id: number; title: string; description: string | null; due_date: string | null; }
interface Attendance { id: number; section_id: number; student_id: number; session_date: string; status: string; }
interface Evaluation { id: number; student_id: number; teacher_id: number; section_id: number; type: string; score: number; max_score: number; notes: string | null; }
interface SectionStudent { id: number; section_id: number; student_id: number; }

const api = async (table: string, params?: Record<string, string>) => {
  const qs = new URLSearchParams({ table, ...params }).toString();
  const res = await fetch(`/api/academy?${qs}`);
  return res.json();
};

const apiPost = async (table: string, data: Record<string, unknown>) => {
  const res = await fetch("/api/academy", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ table, ...data }),
  });
  return res.json();
};

const apiPut = async (table: string, id: number, data: Record<string, unknown>) => {
  const res = await fetch("/api/academy", {
    method: "PUT", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ table, id, ...data }),
  });
  return res.json();
};

const apiDelete = async (table: string, id: number) => {
  const res = await fetch(`/api/academy?table=${table}&id=${id}`, { method: "DELETE" });
  return res.json();
};

export default function AdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [sectionStudents, setSectionStudents] = useState<SectionStudent[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [msg, setMsg] = useState("");

  // Forms
  const [sectionForm, setSectionForm] = useState({ name: "", level: "intro", sub_level: "A", teacher_id: "", max_students: "7", zoom_link: "", schedule: "" });
  const [teacherForm, setTeacherForm] = useState({ firstName: "", lastName: "", email: "", password: "", teacherSubject: "" });

  const fetchAll = useCallback(async () => {
    const jwt = getJwt();
    const [usersRes, sectionsRes, ssRes, assignRes] = await Promise.all([
      fetch(`${STRAPI_URL}/api/users?populate=*`, { headers: { Authorization: `Bearer ${jwt}` } }).then(r => r.json()),
      api("sections"),
      api("section_students"),
      api("assignments"),
    ]);
    setUsers(Array.isArray(usersRes) ? usersRes : []);
    setSections(Array.isArray(sectionsRes) ? sectionsRes : []);
    setSectionStudents(Array.isArray(ssRes) ? ssRes : []);
    setAssignments(Array.isArray(assignRes) ? assignRes : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    const jwt = getJwt();
    if (!jwt) { router.push("/login"); return; }
    fetch(`${STRAPI_URL}/api/users/me`, { headers: { Authorization: `Bearer ${jwt}` } })
      .then(r => r.json())
      .then(u => { if (u?.email !== ADMIN_EMAIL) { router.push("/login"); return; } fetchAll(); })
      .catch(() => router.push("/login"));
  }, [router, fetchAll]);

  const students = users.filter(u => !u.isTeacher && u.email !== ADMIN_EMAIL);
  const teachers = users.filter(u => u.isTeacher);
  const pending = students.filter(s => s.registrationStatus === "pending").length;
  const approved = students.filter(s => s.registrationStatus === "approved").length;

  const updateUser = async (id: number, data: Record<string, unknown>) => {
    await fetch(`${STRAPI_URL}/api/users/${id}`, {
      method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${getJwt()}` },
      body: JSON.stringify(data),
    });
    fetchAll();
  };

  const addTeacher = async () => {
    if (!teacherForm.firstName || !teacherForm.email || !teacherForm.password) { setMsg("يرجى ملء الحقول المطلوبة"); return; }
    try {
      const reg = await fetch(`${STRAPI_URL}/api/auth/local/register`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: teacherForm.email, email: teacherForm.email, password: teacherForm.password }),
      });
      const regData = await reg.json();
      if (!reg.ok) { setMsg(regData?.error?.message || "خطأ"); return; }
      await fetch(`${STRAPI_URL}/api/users/${regData.user.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${getJwt()}` },
        body: JSON.stringify({ firstName: teacherForm.firstName, lastName: teacherForm.lastName, isTeacher: true, teacherSubject: teacherForm.teacherSubject, registrationStatus: "approved" }),
      });
      setMsg("✅ تم إنشاء المدرس"); setTeacherForm({ firstName: "", lastName: "", email: "", password: "", teacherSubject: "" }); fetchAll();
    } catch { setMsg("خطأ في الاتصال"); }
  };

  const addSection = async () => {
    if (!sectionForm.name || !sectionForm.level) { setMsg("يرجى ملء اسم الشعبة والمستوى"); return; }
    await apiPost("sections", { ...sectionForm, teacher_id: sectionForm.teacher_id ? parseInt(sectionForm.teacher_id) : null, max_students: parseInt(sectionForm.max_students) });
    setMsg("✅ تم إنشاء الشعبة"); setSectionForm({ name: "", level: "intro", sub_level: "A", teacher_id: "", max_students: "7", zoom_link: "", schedule: "" }); fetchAll();
  };

  const enrollStudent = async (sectionId: number, studentId: number) => {
    const count = sectionStudents.filter(ss => ss.section_id === sectionId).length;
    const section = sections.find(s => s.id === sectionId);
    if (section && count >= section.max_students) { setMsg(`❌ الشعبة ممتلئة (${section.max_students} طلاب كحد أقصى)`); return; }
    await apiPost("section_students", { section_id: sectionId, student_id: studentId });
    setMsg("✅ تم تسجيل الطالب في الشعبة"); fetchAll();
  };

  const filtered = students.filter(s => {
    const name = `${s.firstName || ""} ${s.lastName || ""} ${s.email}`.toLowerCase();
    if (search && !name.includes(search.toLowerCase())) return false;
    if (filterStatus !== "all" && s.registrationStatus !== filterStatus) return false;
    return true;
  });

  const handleLogout = () => { clearSession(); router.push("/"); };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[var(--soft-white)]"><div className="w-10 h-10 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin" /></div>;

  const tabs = [
    { id: "overview", label: "نظرة عامة", icon: "📊" },
    { id: "students", label: "الطلاب", icon: "🎓", badge: pending },
    { id: "teachers", label: "المدرسون", icon: "👨‍🏫" },
    { id: "sections", label: "الشعب", icon: "📚" },
    { id: "assignments", label: "الواجبات", icon: "📝" },
    { id: "materials", label: "الكتب", icon: "📖" },
  ];

  const inputCls = "w-full px-4 py-3 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-[var(--primary-light)] focus:bg-white transition";
  const selectCls = inputCls + " appearance-none";
  const btnPrimary = "px-6 py-3 bg-[var(--primary)] text-white rounded-xl font-bold hover:bg-[var(--primary-dark)] transition text-sm";
  const btnSuccess = "px-3 py-1 bg-green-500 text-white text-xs rounded-lg font-bold hover:bg-green-600";
  const btnDanger = "px-3 py-1 bg-red-500 text-white text-xs rounded-lg font-bold hover:bg-red-600";

  return (
    <div className="min-h-screen bg-[var(--soft-white)] flex pt-16">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 right-0 z-40 w-64 bg-[var(--primary-dark)] text-white transform transition-transform duration-300 md:translate-x-0 md:static md:pt-0 pt-16 ${sidebarOpen ? "translate-x-0" : "translate-x-full md:translate-x-0"}`}>
        <div className="p-6 border-b border-white/10">
          <h3 className="font-bold text-lg">🏛️ لوحة الإدارة</h3>
          <p className="text-blue-200/60 text-xs mt-1">E.L.A Academy</p>
        </div>
        <div className="p-4 border-b border-white/10 space-y-2 text-xs">
          <div className="flex justify-between"><span className="text-blue-200/60">الطلاب</span><span className="font-bold">{students.length}</span></div>
          <div className="flex justify-between"><span className="text-amber-300">⏳ بانتظار</span><span className="font-bold">{pending}</span></div>
          <div className="flex justify-between"><span className="text-green-300">✅ مقبول</span><span className="font-bold">{approved}</span></div>
          <div className="flex justify-between"><span className="text-blue-200/60">👨‍🏫 مدرسون</span><span className="font-bold">{teachers.length}</span></div>
          <div className="flex justify-between"><span className="text-blue-200/60">📚 شعب</span><span className="font-bold">{sections.length}</span></div>
        </div>
        <nav className="p-4 space-y-1">
          {tabs.map(t => (
            <button key={t.id} onClick={() => { setActiveTab(t.id); setSidebarOpen(false); setMsg(""); }}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition ${activeTab === t.id ? "bg-white/10 text-white" : "text-blue-200/60 hover:text-white hover:bg-white/5"}`}>
              <span className="flex items-center gap-3"><span>{t.icon}</span>{t.label}</span>
              {t.badge ? <span className="bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{t.badge}</span> : null}
            </button>
          ))}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-red-300 hover:bg-red-500/10 transition">🚪 خروج</button>
        </div>
      </aside>

      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => setSidebarOpen(false)} />}

      <main className="flex-1 p-6 md:p-8">
        <button onClick={() => setSidebarOpen(true)} className="md:hidden mb-4 p-2 bg-white rounded-lg shadow-sm">
          <svg className="w-6 h-6 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>

        {msg && <div className={`mb-4 p-3 rounded-xl text-sm ${msg.includes("✅") ? "bg-green-50 text-green-700" : msg.includes("❌") ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}>{msg}</div>}

        {/* === OVERVIEW === */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-[var(--primary)]">📊 نظرة عامة</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[
                { label: "الطلاب", value: students.length, color: "text-[var(--primary)]" },
                { label: "بانتظار", value: pending, color: "text-amber-600" },
                { label: "مقبولون", value: approved, color: "text-green-600" },
                { label: "مدرسون", value: teachers.length, color: "text-purple-600" },
                { label: "شعب", value: sections.length, color: "text-blue-600" },
              ].map((s, i) => (
                <div key={i} className="bg-white rounded-xl p-5 border border-gray-100">
                  <p className="text-[var(--text-gray)] text-xs">{s.label}</p>
                  <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
                </div>
              ))}
            </div>
            {/* Recent students */}
            <div className="bg-white rounded-xl border border-gray-100 p-6">
              <h3 className="font-bold text-[var(--primary)] mb-4">آخر المسجلين</h3>
              {students.slice(-5).reverse().map(s => (
                <div key={s.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[var(--primary)]/10 flex items-center justify-center text-xs font-bold text-[var(--primary)]">{(s.firstName || s.email)[0]?.toUpperCase()}</div>
                    <div><p className="text-sm font-medium">{s.firstName} {s.lastName}</p><p className="text-xs text-[var(--text-gray)]">{s.email}</p></div>
                  </div>
                  {s.registrationStatus === "pending" && <button onClick={() => updateUser(s.id, { registrationStatus: "approved" })} className={btnSuccess}>قبول ✓</button>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* === STUDENTS === */}
        {activeTab === "students" && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-[var(--primary)]">🎓 الطلاب ({filtered.length})</h2>
            <div className="flex flex-wrap gap-3">
              <input placeholder="بحث..." value={search} onChange={e => setSearch(e.target.value)} className="flex-1 min-w-[200px] px-4 py-2 border border-gray-200 rounded-lg text-sm bg-white" />
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white">
                <option value="all">كل الحالات</option><option value="pending">بانتظار</option><option value="approved">مقبول</option><option value="rejected">مرفوض</option>
              </select>
            </div>
            {filtered.map(s => (
              <div key={s.id} className="bg-white rounded-xl p-5 border border-gray-100">
                <div className="flex items-start justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[var(--primary)]/10 flex items-center justify-center font-bold text-[var(--primary)]">{(s.firstName || s.email)[0]?.toUpperCase()}</div>
                    <div>
                      <p className="font-bold text-[var(--text-dark)]">{s.firstName} {s.lastName}</p>
                      <p className="text-xs text-[var(--text-gray)]">{s.email} • {s.phone || "—"} • {s.residenceCountry || "—"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Enroll in section */}
                    <select onChange={e => { if (e.target.value) enrollStudent(parseInt(e.target.value), s.id); e.target.value = ""; }}
                      className="px-2 py-1 border border-gray-200 rounded text-xs bg-white">
                      <option value="">تسجيل في شعبة...</option>
                      {sections.filter(sec => sec.is_active).map(sec => (
                        <option key={sec.id} value={sec.id}>{sec.name} ({LEVELS.find(l=>l.value===sec.level)?.label} {sec.sub_level}) [{sectionStudents.filter(ss=>ss.section_id===sec.id).length}/{sec.max_students}]</option>
                      ))}
                    </select>
                    {s.registrationStatus === "pending" && (
                      <><button onClick={() => updateUser(s.id, { registrationStatus: "approved" })} className={btnSuccess}>✓ قبول</button>
                      <button onClick={() => updateUser(s.id, { registrationStatus: "rejected" })} className={btnDanger}>✗ رفض</button></>
                    )}
                    {s.registrationStatus === "approved" && <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full font-bold">مقبول</span>}
                    {s.registrationStatus === "rejected" && <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full font-bold">مرفوض</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* === TEACHERS === */}
        {activeTab === "teachers" && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-[var(--primary)]">👨‍🏫 المدرسون</h2>
            <div className="bg-white rounded-xl p-6 border border-gray-100">
              <h3 className="font-bold text-[var(--primary)] mb-4">إضافة مدرس جديد</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input placeholder="الاسم الأول *" value={teacherForm.firstName} onChange={e => setTeacherForm({...teacherForm, firstName: e.target.value})} className={inputCls} />
                <input placeholder="اسم العائلة" value={teacherForm.lastName} onChange={e => setTeacherForm({...teacherForm, lastName: e.target.value})} className={inputCls} />
                <input placeholder="البريد الإلكتروني *" type="email" value={teacherForm.email} onChange={e => setTeacherForm({...teacherForm, email: e.target.value})} className={inputCls} />
                <input placeholder="كلمة المرور *" type="password" value={teacherForm.password} onChange={e => setTeacherForm({...teacherForm, password: e.target.value})} className={inputCls} />
                <input placeholder="التخصص" value={teacherForm.teacherSubject} onChange={e => setTeacherForm({...teacherForm, teacherSubject: e.target.value})} className={inputCls} />
              </div>
              <button onClick={addTeacher} className={`mt-4 ${btnPrimary}`}>➕ إضافة مدرس</button>
            </div>
            {teachers.map(t => (
              <div key={t.id} className="bg-white rounded-xl p-5 border border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center font-bold text-purple-600">{(t.firstName || t.email)[0]?.toUpperCase()}</div>
                  <div>
                    <p className="font-bold">{t.firstName} {t.lastName}</p>
                    <p className="text-xs text-[var(--text-gray)]">{t.email} • {t.teacherSubject || "—"}</p>
                    <p className="text-xs text-blue-500">{sections.filter(s => s.teacher_id === t.id).length} شعبة</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* === SECTIONS === */}
        {activeTab === "sections" && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-[var(--primary)]">📚 الشعب والفصول</h2>
            <div className="bg-white rounded-xl p-6 border border-gray-100">
              <h3 className="font-bold text-[var(--primary)] mb-4">إنشاء شعبة جديدة</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input placeholder="اسم الشعبة *" value={sectionForm.name} onChange={e => setSectionForm({...sectionForm, name: e.target.value})} className={inputCls} />
                <select value={sectionForm.level} onChange={e => setSectionForm({...sectionForm, level: e.target.value})} className={selectCls}>
                  {LEVELS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                </select>
                <select value={sectionForm.sub_level} onChange={e => setSectionForm({...sectionForm, sub_level: e.target.value})} className={selectCls}>
                  {SUB_LEVELS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <select value={sectionForm.teacher_id} onChange={e => setSectionForm({...sectionForm, teacher_id: e.target.value})} className={selectCls}>
                  <option value="">اختر المدرس</option>
                  {teachers.map(t => <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>)}
                </select>
                <input placeholder="الحد الأقصى للطلاب" type="number" value={sectionForm.max_students} onChange={e => setSectionForm({...sectionForm, max_students: e.target.value})} className={inputCls} />
                <input placeholder="رابط Zoom" value={sectionForm.zoom_link} onChange={e => setSectionForm({...sectionForm, zoom_link: e.target.value})} className={inputCls} />
                <input placeholder="الجدول (مثال: الأحد والثلاثاء 6-8 م)" value={sectionForm.schedule} onChange={e => setSectionForm({...sectionForm, schedule: e.target.value})} className={inputCls} />
              </div>
              <button onClick={addSection} className={`mt-4 ${btnPrimary}`}>➕ إنشاء شعبة</button>
            </div>
            {sections.map(sec => {
              const secStudents = sectionStudents.filter(ss => ss.section_id === sec.id);
              const teacher = teachers.find(t => t.id === sec.teacher_id);
              return (
                <div key={sec.id} className="bg-white rounded-xl p-5 border border-gray-100">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-bold text-[var(--primary)]">{sec.name}</h3>
                      <p className="text-xs text-[var(--text-gray)]">
                        {LEVELS.find(l=>l.value===sec.level)?.label} {sec.sub_level} • 
                        👨‍🏫 {teacher ? `${teacher.firstName} ${teacher.lastName}` : "بدون مدرس"} • 
                        👥 {secStudents.length}/{sec.max_students}
                      </p>
                      {sec.schedule && <p className="text-xs text-blue-500 mt-1">🕐 {sec.schedule}</p>}
                      {sec.zoom_link && <a href={sec.zoom_link} target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline">🔗 Zoom</a>}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => apiPut("sections", sec.id, { is_active: !sec.is_active }).then(fetchAll)}
                        className={`px-3 py-1 text-xs rounded-lg font-bold ${sec.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                        {sec.is_active ? "نشطة ✓" : "معطلة"}
                      </button>
                      <button onClick={() => { if(confirm("حذف الشعبة؟")) apiDelete("sections", sec.id).then(fetchAll); }} className={btnDanger}>حذف</button>
                    </div>
                  </div>
                  {secStudents.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <p className="text-xs font-bold text-[var(--text-gray)] mb-2">الطلاب المسجلون:</p>
                      <div className="flex flex-wrap gap-2">
                        {secStudents.map(ss => {
                          const st = students.find(s => s.id === ss.student_id);
                          return st ? (
                            <span key={ss.id} className="px-3 py-1 bg-blue-50 text-blue-700 text-xs rounded-full flex items-center gap-1">
                              {st.firstName} {st.lastName}
                              <button onClick={() => apiDelete("section_students", ss.id).then(fetchAll)} className="text-red-400 hover:text-red-600 mr-1">✕</button>
                            </span>
                          ) : null;
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* === ASSIGNMENTS === */}
        {activeTab === "assignments" && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-[var(--primary)]">📝 الواجبات ({assignments.length})</h2>
            {assignments.length === 0 ? (
              <div className="bg-white rounded-xl p-8 text-center border border-gray-100">
                <p className="text-[var(--text-gray)]">لا توجد واجبات بعد — المدرسون يضيفونها من بوابتهم</p>
              </div>
            ) : assignments.map(a => {
              const sec = sections.find(s => s.id === a.section_id);
              const teacher = teachers.find(t => t.id === a.teacher_id);
              return (
                <div key={a.id} className="bg-white rounded-xl p-5 border border-gray-100">
                  <h3 className="font-bold text-[var(--text-dark)]">{a.title}</h3>
                  <p className="text-xs text-[var(--text-gray)]">
                    📚 {sec?.name || "—"} • 👨‍🏫 {teacher?.firstName || "—"} • 📅 {a.due_date ? new Date(a.due_date).toLocaleDateString("ar") : "بدون موعد"}
                  </p>
                  {a.description && <p className="text-sm text-[var(--text-gray)] mt-2">{a.description}</p>}
                </div>
              );
            })}
          </div>
        )}

        {/* === MATERIALS === */}
        {activeTab === "materials" && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-[var(--primary)]">📖 الكتب والمواد التعليمية</h2>
            <div className="bg-white rounded-xl p-8 text-center border border-gray-100">
              <p className="text-[var(--text-gray)]">سيتم إضافة نظام رفع الكتب قريباً</p>
              <p className="text-xs text-[var(--text-gray)] mt-2">كل مستوى: كتاب الطالب + كتاب التمارين (PDF)</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}