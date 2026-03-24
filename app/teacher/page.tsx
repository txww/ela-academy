"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { clearSession } from "@/lib/auth";

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || "http://localhost:1337";
const getJwt = () => localStorage.getItem("jwt") || "";

interface TeacherInfo { id: number; email: string; firstName?: string; lastName?: string; isTeacher?: boolean; teacherSubject?: string; }
interface Section { id: number; name: string; level: string; sub_level: string; teacher_id: number; max_students: number; zoom_link: string | null; schedule: string | null; is_active: boolean; }
interface SectionStudent { id: number; section_id: number; student_id: number; }
interface Student { id: number; email: string; firstName?: string; lastName?: string; phone?: string; telegram?: string; registrationStatus?: string; }
interface Assignment { id: number; section_id: number; teacher_id: number; title: string; description: string | null; due_date: string | null; }

const api = async (table: string, params?: Record<string, string>) => {
  const qs = new URLSearchParams({ table, ...params }).toString();
  return fetch(`/api/academy?${qs}`).then(r => r.json());
};
const apiPost = async (table: string, data: Record<string, unknown>) =>
  fetch("/api/academy", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ table, ...data }) }).then(r => r.json());
const apiDelete = async (table: string, id: number) =>
  fetch(`/api/academy?table=${table}&id=${id}`, { method: "DELETE" }).then(r => r.json());

export default function TeacherPage() {
  const router = useRouter();
  const [teacher, setTeacher] = useState<TeacherInfo | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [sectionStudents, setSectionStudents] = useState<SectionStudent[]>([]);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("sections");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedSection, setSelectedSection] = useState<number | null>(null);
  const [msg, setMsg] = useState("");

  // Forms
  const [assignForm, setAssignForm] = useState({ section_id: "", title: "", description: "", due_date: "" });
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split("T")[0]);

  const fetchData = useCallback(async (teacherId: number) => {
    const jwt = getJwt();
    const [secs, ss, stuRes, assigns] = await Promise.all([
      api("sections", { teacher_id: String(teacherId) }),
      api("section_students"),
      fetch(`${STRAPI_URL}/api/users?populate=*`, { headers: { Authorization: `Bearer ${jwt}` } }).then(r => r.json()),
      api("assignments", { teacher_id: String(teacherId) }),
    ]);
    setSections(Array.isArray(secs) ? secs : []);
    setSectionStudents(Array.isArray(ss) ? ss : []);
    setAllStudents(Array.isArray(stuRes) ? stuRes.filter((u: Student) => u.registrationStatus === "approved") : []);
    setAssignments(Array.isArray(assigns) ? assigns : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    const jwt = getJwt();
    if (!jwt) { router.push("/login"); return; }
    fetch(`${STRAPI_URL}/api/users/me`, { headers: { Authorization: `Bearer ${jwt}` } })
      .then(r => r.json())
      .then(u => {
        if (!u?.isTeacher) { router.push("/login"); return; }
        setTeacher(u);
        fetchData(u.id);
      })
      .catch(() => router.push("/login"));
  }, [router, fetchData]);

  const getStudentsForSection = (sectionId: number) => {
    const ids = sectionStudents.filter(ss => ss.section_id === sectionId).map(ss => ss.student_id);
    return allStudents.filter(s => ids.includes(s.id));
  };

  const addAssignment = async () => {
    if (!assignForm.section_id || !assignForm.title) { setMsg("يرجى اختيار الشعبة والعنوان"); return; }
    await apiPost("assignments", { ...assignForm, section_id: parseInt(assignForm.section_id), teacher_id: teacher!.id, due_date: assignForm.due_date || null });
    setMsg("✅ تم إضافة الواجب"); setAssignForm({ section_id: "", title: "", description: "", due_date: "" });
    fetchData(teacher!.id);
  };

  const markAttendance = async (sectionId: number, studentId: number, status: string) => {
    await apiPost("attendance", { section_id: sectionId, student_id: studentId, session_date: attendanceDate, status, marked_by: teacher!.id });
    setMsg(`✅ تم تسجيل ${status === "present" ? "حضور" : "غياب"}`);
  };

  const addEvaluation = async (studentId: number, sectionId: number, score: number, notes: string) => {
    await apiPost("evaluations", { student_id: studentId, teacher_id: teacher!.id, section_id: sectionId, type: "monthly", score, max_score: 100, notes });
    setMsg("✅ تم حفظ التقييم");
  };

  const handleLogout = () => { clearSession(); router.push("/"); };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[var(--soft-white)]"><div className="w-10 h-10 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin" /></div>;

  const totalStudents = sections.reduce((acc, sec) => acc + sectionStudents.filter(ss => ss.section_id === sec.id).length, 0);
  const tabs = [
    { id: "sections", label: "شعبي", icon: "📚" },
    { id: "attendance", label: "الحضور", icon: "✅" },
    { id: "assignments", label: "الواجبات", icon: "📝" },
    { id: "evaluations", label: "التقييم", icon: "⭐" },
  ];

  const inputCls = "w-full px-4 py-3 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-[var(--primary-light)] focus:bg-white transition";

  return (
    <div className="min-h-screen bg-[var(--soft-white)] flex pt-16">
      <aside className={`fixed inset-y-0 right-0 z-40 w-64 bg-[var(--primary-dark)] text-white transform transition-transform duration-300 md:translate-x-0 md:static md:pt-0 pt-16 ${sidebarOpen ? "translate-x-0" : "translate-x-full md:translate-x-0"}`}>
        <div className="p-6 border-b border-white/10">
          <div className="w-14 h-14 rounded-full bg-[var(--primary-light)] flex items-center justify-center text-xl font-bold mb-3">{(teacher?.firstName || "T")[0]?.toUpperCase()}</div>
          <h3 className="font-bold text-sm">{teacher?.firstName} {teacher?.lastName}</h3>
          <p className="text-blue-200/60 text-xs mt-1">{teacher?.teacherSubject || "مدرس"}</p>
        </div>
        <div className="p-4 border-b border-white/10 space-y-2 text-xs">
          <div className="flex justify-between"><span className="text-blue-200/60">شعبي</span><span className="font-bold">{sections.length}</span></div>
          <div className="flex justify-between"><span className="text-blue-200/60">طلابي</span><span className="font-bold">{totalStudents}</span></div>
          <div className="flex justify-between"><span className="text-blue-200/60">واجبات</span><span className="font-bold">{assignments.length}</span></div>
        </div>
        <nav className="p-4 space-y-1">
          {tabs.map(t => (
            <button key={t.id} onClick={() => { setActiveTab(t.id); setSidebarOpen(false); setMsg(""); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition ${activeTab === t.id ? "bg-white/10 text-white" : "text-blue-200/60 hover:text-white hover:bg-white/5"}`}>
              <span>{t.icon}</span>{t.label}
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

        {msg && <div className={`mb-4 p-3 rounded-xl text-sm ${msg.includes("✅") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>{msg}</div>}

        {/* SECTIONS */}
        {activeTab === "sections" && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-[var(--primary)]">📚 شعبي ({sections.length})</h2>
            {sections.map(sec => {
              const studs = getStudentsForSection(sec.id);
              return (
                <div key={sec.id} className="bg-white rounded-xl p-5 border border-gray-100">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-bold text-[var(--primary)]">{sec.name}</h3>
                      <p className="text-xs text-[var(--text-gray)]">👥 {studs.length}/{sec.max_students} طالب {sec.schedule ? `• 🕐 ${sec.schedule}` : ""}</p>
                    </div>
                    {sec.zoom_link && <a href={sec.zoom_link} target="_blank" rel="noreferrer" className="px-3 py-1 bg-[var(--primary)] text-white text-xs rounded-lg font-bold">🔗 Zoom</a>}
                  </div>
                  {studs.length > 0 && (
                    <div className="space-y-2">
                      {studs.map(st => (
                        <div key={st.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-[var(--primary)]/10 flex items-center justify-center text-xs font-bold text-[var(--primary)]">{(st.firstName || st.email)[0]?.toUpperCase()}</div>
                            <div><p className="text-sm font-medium">{st.firstName} {st.lastName}</p><p className="text-xs text-[var(--text-gray)]">{st.phone || ""} {st.telegram ? `• @${st.telegram}` : ""}</p></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            {sections.length === 0 && <div className="bg-white rounded-xl p-8 text-center border"><p className="text-[var(--text-gray)]">لم يتم تعيين شعب لك بعد</p></div>}
          </div>
        )}

        {/* ATTENDANCE */}
        {activeTab === "attendance" && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-[var(--primary)]">✅ تسجيل الحضور</h2>
            <div className="flex gap-3 items-center">
              <input type="date" value={attendanceDate} onChange={e => setAttendanceDate(e.target.value)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm bg-white" />
              <select value={selectedSection || ""} onChange={e => setSelectedSection(parseInt(e.target.value) || null)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm bg-white">
                <option value="">اختر الشعبة</option>
                {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            {selectedSection && (
              <div className="bg-white rounded-xl p-5 border border-gray-100">
                <h3 className="font-bold text-[var(--primary)] mb-4">{sections.find(s=>s.id===selectedSection)?.name} — {attendanceDate}</h3>
                {getStudentsForSection(selectedSection).map(st => (
                  <div key={st.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-[var(--primary)]/10 flex items-center justify-center text-xs font-bold text-[var(--primary)]">{(st.firstName || "?")[0]?.toUpperCase()}</div>
                      <p className="text-sm font-medium">{st.firstName} {st.lastName}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => markAttendance(selectedSection, st.id, "present")} className="px-3 py-1 bg-green-500 text-white text-xs rounded-lg font-bold hover:bg-green-600">حاضر ✓</button>
                      <button onClick={() => markAttendance(selectedSection, st.id, "absent")} className="px-3 py-1 bg-red-500 text-white text-xs rounded-lg font-bold hover:bg-red-600">غائب ✕</button>
                      <button onClick={() => markAttendance(selectedSection, st.id, "late")} className="px-3 py-1 bg-amber-500 text-white text-xs rounded-lg font-bold hover:bg-amber-600">متأخر</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ASSIGNMENTS */}
        {activeTab === "assignments" && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-[var(--primary)]">📝 الواجبات</h2>
            <div className="bg-white rounded-xl p-6 border border-gray-100">
              <h3 className="font-bold text-[var(--primary)] mb-4">إضافة واجب جديد</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <select value={assignForm.section_id} onChange={e => setAssignForm({...assignForm, section_id: e.target.value})} className={inputCls}>
                  <option value="">اختر الشعبة *</option>
                  {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <input placeholder="عنوان الواجب *" value={assignForm.title} onChange={e => setAssignForm({...assignForm, title: e.target.value})} className={inputCls} />
                <textarea placeholder="الوصف / التفاصيل" value={assignForm.description} onChange={e => setAssignForm({...assignForm, description: e.target.value})} className={inputCls + " md:col-span-2"} rows={3} />
                <input type="datetime-local" value={assignForm.due_date} onChange={e => setAssignForm({...assignForm, due_date: e.target.value})} className={inputCls} />
              </div>
              <button onClick={addAssignment} className="mt-4 px-6 py-3 bg-[var(--primary)] text-white rounded-xl font-bold hover:bg-[var(--primary-dark)] transition text-sm">➕ إضافة واجب</button>
            </div>
            {assignments.map(a => {
              const sec = sections.find(s => s.id === a.section_id);
              return (
                <div key={a.id} className="bg-white rounded-xl p-5 border border-gray-100 flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-[var(--text-dark)]">{a.title}</h3>
                    <p className="text-xs text-[var(--text-gray)]">📚 {sec?.name || "—"} • 📅 {a.due_date ? new Date(a.due_date).toLocaleDateString("ar") : "بدون موعد"}</p>
                    {a.description && <p className="text-sm text-[var(--text-gray)] mt-1">{a.description}</p>}
                  </div>
                  <button onClick={() => { if(confirm("حذف الواجب؟")) apiDelete("assignments", a.id).then(() => fetchData(teacher!.id)); }} className="px-2 py-1 text-red-400 hover:text-red-600 text-xs">🗑</button>
                </div>
              );
            })}
          </div>
        )}

        {/* EVALUATIONS */}
        {activeTab === "evaluations" && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-[var(--primary)]">⭐ تقييم الطلاب</h2>
            <select value={selectedSection || ""} onChange={e => setSelectedSection(parseInt(e.target.value) || null)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm bg-white">
              <option value="">اختر الشعبة</option>
              {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            {selectedSection && (
              <div className="bg-white rounded-xl p-5 border border-gray-100">
                <h3 className="font-bold text-[var(--primary)] mb-4">{sections.find(s=>s.id===selectedSection)?.name}</h3>
                {getStudentsForSection(selectedSection).map(st => (
                  <div key={st.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg mb-2 flex-wrap gap-2">
                    <p className="text-sm font-medium">{st.firstName} {st.lastName}</p>
                    <div className="flex items-center gap-2">
                      <input type="number" min="0" max="100" placeholder="الدرجة" id={`score-${st.id}`} className="w-20 px-2 py-1 border rounded text-sm text-center" />
                      <input placeholder="ملاحظات" id={`notes-${st.id}`} className="w-40 px-2 py-1 border rounded text-sm" />
                      <button onClick={() => {
                        const score = parseInt((document.getElementById(`score-${st.id}`) as HTMLInputElement).value);
                        const notes = (document.getElementById(`notes-${st.id}`) as HTMLInputElement).value;
                        if (!isNaN(score)) addEvaluation(st.id, selectedSection, score, notes);
                      }} className="px-3 py-1 bg-[var(--primary)] text-white text-xs rounded-lg font-bold">حفظ</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}