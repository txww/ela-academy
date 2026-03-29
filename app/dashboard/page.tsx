"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { clearSession } from "@/lib/auth";

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || "http://localhost:1337";

interface User { id: number; email: string; firstName?: string; lastName?: string; phone?: string; gender?: string; nationality?: string; residenceCountry?: string; telegram?: string; registrationStatus?: string; academicYear?: string; }
interface Section { id: number; name: string; level: string; sub_level: string; zoom_link: string | null; schedule: string | null; teacher_id: number | null; }
interface Assignment { id: number; section_id: number; title: string; description: string | null; due_date: string | null; }
interface Attendance { id: number; student_id: number; session_date: string; status: string; section_id: number; }
interface Evaluation { id: number; student_id: number; score: number; max_score: number; notes: string | null; type: string; created_at: string; section_id: number; }
interface Session { id: number; section_id: number; title: string; date: string; zoom_link: string | null; description: string | null; }

const LEVELS: Record<string, string> = { intro: "Intro (0)", level1: "Level 1", level2: "Level 2", level3: "Level 3", conversation: "Conversation" };
const statusConfig: Record<string, { label: string; color: string; bg: string; icon: string; message: string }> = {
  pending: { label: "قيد المراجعة", color: "text-amber-600", bg: "bg-amber-50 border-amber-200", icon: "⏳", message: "طلب تسجيلك قيد المراجعة. سيتم إبلاغك بالنتيجة قريباً." },
  approved: { label: "مقبول", color: "text-green-600", bg: "bg-green-50 border-green-200", icon: "🎉", message: "مرحباً بك في أكاديمية E.L.A! تم قبول تسجيلك بنجاح." },
  rejected: { label: "مرفوض", color: "text-red-600", bg: "bg-red-50 border-red-200", icon: "❌", message: "للأسف لم يتم قبول تسجيلك. تواصل مع الإدارة لمزيد من المعلومات." },
};

const api = async (table: string, params?: Record<string, string>) => {
  const qs = new URLSearchParams({ table, ...params }).toString();
  const res = await fetch(`/api/academy?${qs}`);
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : [];
};

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  const fetchStudentData = useCallback(async (userId: number) => {
    const [ssData, attData, evalData] = await Promise.all([
      api("section_students", { student_id: String(userId) }),
      api("attendance", { student_id: String(userId) }),
      api("evaluations", { student_id: String(userId) }),
    ]);
    const sectionIds = ssData.map((ss: { section_id: number }) => ss.section_id);
    if (sectionIds.length > 0) {
      const allSections = await api("sections");
      setSections(allSections.filter((s: Section) => sectionIds.includes(s.id)));
      const [allAssignments, allSessions] = await Promise.all([api("assignments"), api("section_sessions")]);
      setAssignments(allAssignments.filter((a: Assignment) => sectionIds.includes(a.section_id)));
      setSessions(allSessions.filter((s: Session) => sectionIds.includes(s.section_id)));
    }
    setAttendance(attData);
    setEvaluations(evalData);
  }, []);

  useEffect(() => {
    const jwt = localStorage.getItem("jwt");
    if (!jwt) { router.push("/login"); return; }
    fetch(`${STRAPI_URL}/api/users/me`, { headers: { Authorization: `Bearer ${jwt}` } })
      .then(r => r.json()).then(u => { if (!u?.id) { router.push("/login"); return; } setUser(u); fetchStudentData(u.id).finally(() => setLoading(false)); })
      .catch(() => router.push("/login"));
  }, [router, fetchStudentData]);

  const handleLogout = () => { clearSession(); router.push("/"); };
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-10 h-10 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin" /></div>;
  if (!user) return null;

  const status = statusConfig[user.registrationStatus || "pending"];
  const fullName = `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email;
  const presentCount = attendance.filter(a => a.status === "present").length;
  const absentCount = attendance.filter(a => a.status === "absent").length;
  const lateCount = attendance.filter(a => a.status === "late").length;
  const totalAtt = attendance.length;
  const attendanceRate = totalAtt > 0 ? Math.round((presentCount / totalAtt) * 100) : 0;
  const upcomingAssignments = assignments.filter(a => a.due_date && new Date(a.due_date) > new Date());
  const upcomingSessions = sessions.filter(s => new Date(s.date) > new Date()).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const avgScore = evaluations.length > 0 ? Math.round(evaluations.reduce((acc, e) => acc + (e.score / e.max_score) * 100, 0) / evaluations.length) : null;

  const tabs = [
    { id: "overview", label: "نظرة عامة", icon: "📊" },
    { id: "sections", label: "شعبتي", icon: "📚", badge: sections.length },
    { id: "sessions", label: "الجلسات", icon: "📹", badge: upcomingSessions.length },
    { id: "assignments", label: "الواجبات", icon: "📝", badge: upcomingAssignments.length },
    { id: "attendance", label: "الحضور", icon: "✅" },
    { id: "evaluations", label: "تقييماتي", icon: "⭐" },
    { id: "profile", label: "بياناتي", icon: "👤" },
  ];

  return (
    <div className="min-h-screen bg-[var(--soft-white)] flex pt-16">
      <aside className={`fixed inset-y-0 right-0 z-40 w-64 bg-[var(--primary-dark)] text-white transform transition-transform duration-300 md:translate-x-0 md:static md:pt-0 pt-16 ${sidebarOpen ? "translate-x-0" : "translate-x-full md:translate-x-0"}`}>
        <div className="p-6 border-b border-white/10">
          <div className="w-14 h-14 rounded-full bg-[var(--primary-light)] flex items-center justify-center text-xl font-bold mb-3">{fullName[0]?.toUpperCase()}</div>
          <h3 className="font-bold text-sm">{fullName}</h3>
          <p className="text-blue-200/60 text-xs mt-1">{user.email}</p>
          <span className={`inline-block mt-2 px-3 py-1 rounded-full text-[10px] font-bold ${user.registrationStatus === "approved" ? "bg-green-500/20 text-green-300" : user.registrationStatus === "rejected" ? "bg-red-500/20 text-red-300" : "bg-amber-500/20 text-amber-300"}`}>{status.icon} {status.label}</span>
        </div>
        {user.registrationStatus === "approved" && (
          <div className="p-4 border-b border-white/10 space-y-2 text-xs">
            <div className="flex justify-between"><span className="text-blue-200/60">📚 شعبي</span><span className="font-bold">{sections.length}</span></div>
            <div className="flex justify-between"><span className="text-blue-200/60">📹 جلسات قادمة</span><span className="font-bold text-green-300">{upcomingSessions.length}</span></div>
            <div className="flex justify-between"><span className="text-blue-200/60">📝 واجبات قادمة</span><span className="font-bold text-amber-300">{upcomingAssignments.length}</span></div>
            <div className="flex justify-between"><span className="text-blue-200/60">✅ الحضور</span><span className={`font-bold ${attendanceRate >= 75 ? "text-green-300" : "text-red-300"}`}>{attendanceRate}%</span></div>
            {avgScore !== null && <div className="flex justify-between"><span className="text-blue-200/60">⭐ الدرجات</span><span className="font-bold text-yellow-300">{avgScore}%</span></div>}
          </div>
        )}
        <nav className="p-4 space-y-1">
          {tabs.map(t => (
            <button key={t.id} onClick={() => { setActiveTab(t.id); setSidebarOpen(false); }}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition ${activeTab === t.id ? "bg-white/10 text-white" : "text-blue-200/60 hover:text-white hover:bg-white/5"}`}>
              <span className="flex items-center gap-3"><span>{t.icon}</span>{t.label}</span>
              {t.badge ? <span className="bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{t.badge}</span> : null}
            </button>
          ))}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-red-300 hover:bg-red-500/10 transition">🚪 تسجيل الخروج</button>
        </div>
      </aside>
      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => setSidebarOpen(false)} />}
      <main className="flex-1 p-6 md:p-8 overflow-y-auto">
        <button onClick={() => setSidebarOpen(true)} className="md:hidden mb-4 p-2 bg-white rounded-lg shadow-sm">
          <svg className="w-6 h-6 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>
        {user.registrationStatus !== "approved" && (
          <div className={`mb-6 p-4 rounded-xl border ${status.bg}`}><p className={`font-bold ${status.color}`}>{status.icon} {status.message}</p></div>
        )}

        {activeTab === "overview" && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-[var(--primary)]">مرحباً {user.firstName || ""} 👋</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "الحالة", value: status.label, color: status.color },
                { label: "جلسات قادمة", value: upcomingSessions.length, color: "text-green-600" },
                { label: "واجبات قادمة", value: upcomingAssignments.length, color: "text-amber-600" },
                { label: "نسبة الحضور", value: `${attendanceRate}%`, color: attendanceRate >= 75 ? "text-green-600" : "text-red-600" },
              ].map((s, i) => <div key={i} className="bg-white rounded-xl p-5 border border-gray-100"><p className="text-[var(--text-gray)] text-xs">{s.label}</p><p className={`text-xl font-bold mt-1 ${s.color}`}>{s.value}</p></div>)}
            </div>
            {upcomingSessions.length > 0 && (
              <div className="bg-white rounded-xl p-6 border border-gray-100">
                <h3 className="font-bold text-[var(--primary)] mb-4">📹 الجلسات القادمة</h3>
                {upcomingSessions.slice(0, 3).map(s => {
                  const sec = sections.find(sec => sec.id === s.section_id);
                  return (
                    <div key={s.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg mb-2 border border-green-100">
                      <div><p className="font-bold text-sm">{s.title}</p><p className="text-xs text-[var(--text-gray)]">📚 {sec?.name} • {new Date(s.date).toLocaleString("ar", { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p></div>
                      {s.zoom_link && <a href={s.zoom_link} target="_blank" rel="noreferrer" className="px-3 py-1 bg-[var(--primary)] text-white text-xs rounded-lg font-bold">انضم 🔗</a>}
                    </div>
                  );
                })}
              </div>
            )}
            {upcomingAssignments.length > 0 && (
              <div className="bg-white rounded-xl p-6 border border-gray-100">
                <h3 className="font-bold text-[var(--primary)] mb-4">📝 واجبات قادمة</h3>
                {upcomingAssignments.slice(0, 3).map(a => {
                  const sec = sections.find(s => s.id === a.section_id);
                  const d = a.due_date ? Math.ceil((new Date(a.due_date).getTime() - Date.now()) / 86400000) : null;
                  return (
                    <div key={a.id} className="flex items-center justify-between p-3 bg-amber-50 rounded-lg mb-2 border border-amber-100">
                      <div><p className="font-bold text-sm">{a.title}</p><p className="text-xs text-[var(--text-gray)]">📚 {sec?.name}</p></div>
                      {d !== null && <span className={`text-xs font-bold px-2 py-1 rounded-full ${d <= 2 ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-600"}`}>{d === 0 ? "اليوم!" : `${d} يوم`}</span>}
                    </div>
                  );
                })}
              </div>
            )}
            {sections.length > 0 && (
              <div className="bg-white rounded-xl p-6 border border-gray-100">
                <h3 className="font-bold text-[var(--primary)] mb-4">📚 شعبتي</h3>
                {sections.map(sec => (
                  <div key={sec.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg mb-2">
                    <div><p className="font-bold text-sm">{sec.name}</p><p className="text-xs text-[var(--text-gray)]">{LEVELS[sec.level]} {sec.sub_level} {sec.schedule ? `• 🕐 ${sec.schedule}` : ""}</p></div>
                    {sec.zoom_link && <a href={sec.zoom_link} target="_blank" rel="noreferrer" className="px-3 py-1 bg-[var(--primary)] text-white text-xs rounded-lg font-bold">Zoom 🔗</a>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "sections" && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-[var(--primary)]">📚 شعبتي ({sections.length})</h2>
            {sections.length === 0 ? <div className="bg-white rounded-xl p-8 text-center border"><p className="text-[var(--text-gray)]">لم يتم تعيينك في شعبة بعد</p></div>
            : sections.map(sec => (
              <div key={sec.id} className="bg-white rounded-xl p-6 border border-gray-100">
                <div className="flex justify-between items-start">
                  <div><h3 className="font-bold text-lg text-[var(--primary)]">{sec.name}</h3><p className="text-sm text-[var(--text-gray)] mt-1">📖 {LEVELS[sec.level]} — {sec.sub_level}</p>{sec.schedule && <p className="text-sm text-blue-600 mt-1">🕐 {sec.schedule}</p>}</div>
                  {sec.zoom_link && <a href={sec.zoom_link} target="_blank" rel="noreferrer" className="px-4 py-2 bg-[var(--primary)] text-white rounded-xl text-sm font-bold">انضم 🔗</a>}
                </div>
                {sessions.filter(s => s.section_id === sec.id && new Date(s.date) > new Date()).length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <p className="text-xs font-bold text-[var(--text-gray)] mb-2">جلسات قادمة:</p>
                    {sessions.filter(s => s.section_id === sec.id && new Date(s.date) > new Date()).slice(0, 3).map(s => (
                      <div key={s.id} className="flex justify-between items-center p-2 bg-green-50 rounded-lg mb-1">
                        <p className="text-sm">{s.title}</p>
                        <div className="flex gap-2 items-center">
                          <span className="text-xs text-[var(--text-gray)]">{new Date(s.date).toLocaleDateString("ar")}</span>
                          {s.zoom_link && <a href={s.zoom_link} target="_blank" rel="noreferrer" className="px-2 py-0.5 bg-[var(--primary)] text-white text-xs rounded font-bold">🔗</a>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {assignments.filter(a => a.section_id === sec.id).length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-xs font-bold text-[var(--text-gray)] mb-2">الواجبات:</p>
                    {assignments.filter(a => a.section_id === sec.id).map(a => (
                      <div key={a.id} className="flex justify-between items-center p-2 bg-gray-50 rounded-lg mb-1">
                        <p className="text-sm">{a.title}</p>
                        <span className="text-xs text-[var(--text-gray)]">{a.due_date ? new Date(a.due_date).toLocaleDateString("ar") : "بدون موعد"}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {activeTab === "sessions" && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-[var(--primary)]">📹 الجلسات ({sessions.length})</h2>
            {sessions.length === 0 ? <div className="bg-white rounded-xl p-8 text-center border"><p className="text-4xl mb-3">📹</p><p className="text-[var(--text-gray)]">لا توجد جلسات بعد</p></div> : (
              <>
                {upcomingSessions.length > 0 && (
                  <div>
                    <h3 className="text-sm font-bold text-green-600 mb-2">⏰ قادمة ({upcomingSessions.length})</h3>
                    {upcomingSessions.map(s => {
                      const sec = sections.find(sec => sec.id === s.section_id);
                      return (
                        <div key={s.id} className="bg-white rounded-xl p-5 border border-green-100 mb-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-bold">{s.title}</h3>
                              <p className="text-xs text-[var(--text-gray)] mt-1">📚 {sec?.name || "—"}</p>
                              <p className="text-sm text-blue-600 mt-1">📅 {new Date(s.date).toLocaleString("ar", { weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                              {s.description && <p className="text-sm text-[var(--text-gray)] mt-2">{s.description}</p>}
                            </div>
                            {s.zoom_link && <a href={s.zoom_link} target="_blank" rel="noreferrer" className="px-4 py-2 bg-[var(--primary)] text-white rounded-xl text-sm font-bold">انضم 🔗</a>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                {sessions.filter(s => new Date(s.date) <= new Date()).length > 0 && (
                  <div>
                    <h3 className="text-sm font-bold text-gray-400 mb-2">✓ منتهية</h3>
                    {sessions.filter(s => new Date(s.date) <= new Date()).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(s => {
                      const sec = sections.find(sec => sec.id === s.section_id);
                      return <div key={s.id} className="bg-white rounded-xl p-4 border border-gray-100 mb-2 opacity-70"><p className="font-bold text-sm">{s.title}</p><p className="text-xs text-[var(--text-gray)]">📚 {sec?.name} • {new Date(s.date).toLocaleDateString("ar")}</p></div>;
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === "assignments" && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-[var(--primary)]">📝 الواجبات ({assignments.length})</h2>
            {assignments.length === 0 ? <div className="bg-white rounded-xl p-8 text-center border"><p className="text-4xl mb-3">📝</p><p className="text-[var(--text-gray)]">لا توجد واجبات</p></div> : (
              <>
                {upcomingAssignments.length > 0 && <div><h3 className="text-sm font-bold text-amber-600 mb-2">⏰ قادمة</h3>{upcomingAssignments.map(a => { const sec = sections.find(s => s.id === a.section_id); const d = a.due_date ? Math.ceil((new Date(a.due_date).getTime() - Date.now()) / 86400000) : null; return <div key={a.id} className="bg-white rounded-xl p-5 border border-amber-100 mb-3"><div className="flex justify-between items-start"><div><h3 className="font-bold">{a.title}</h3><p className="text-xs text-[var(--text-gray)] mt-1">📚 {sec?.name}</p>{a.description && <p className="text-sm text-[var(--text-gray)] mt-2">{a.description}</p>}</div>{d !== null && <span className={`text-xs font-bold px-2 py-1 rounded-full ${d <= 2 ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-600"}`}>{d === 0 ? "اليوم!" : `${d} يوم`}</span>}</div></div>; })}</div>}
                {assignments.filter(a => !a.due_date || new Date(a.due_date) <= new Date()).length > 0 && <div><h3 className="text-sm font-bold text-gray-400 mb-2">✓ منتهية</h3>{assignments.filter(a => !a.due_date || new Date(a.due_date) <= new Date()).map(a => { const sec = sections.find(s => s.id === a.section_id); return <div key={a.id} className="bg-white rounded-xl p-4 border border-gray-100 mb-2 opacity-70"><h3 className="font-bold line-through text-sm">{a.title}</h3><p className="text-xs text-[var(--text-gray)]">📚 {sec?.name}</p></div>; })}</div>}
              </>
            )}
          </div>
        )}

        {activeTab === "attendance" && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-[var(--primary)]">✅ سجل الحضور</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[{ label: "حاضر", value: presentCount, color: "text-green-600", bg: "bg-green-50" }, { label: "غائب", value: absentCount, color: "text-red-600", bg: "bg-red-50" }, { label: "متأخر", value: lateCount, color: "text-amber-600", bg: "bg-amber-50" }, { label: "نسبة الحضور", value: `${attendanceRate}%`, color: attendanceRate >= 75 ? "text-green-600" : "text-red-600", bg: "bg-white" }].map((s, i) => <div key={i} className={`${s.bg} rounded-xl p-4 border border-gray-100 text-center`}><p className="text-xs text-[var(--text-gray)]">{s.label}</p><p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p></div>)}
            </div>
            {totalAtt > 0 && <div className="bg-white rounded-xl p-5 border border-gray-100"><div className="flex justify-between text-xs text-[var(--text-gray)] mb-2"><span>نسبة الحضور</span><span>{attendanceRate}%</span></div><div className="w-full bg-gray-100 rounded-full h-3"><div className={`h-3 rounded-full ${attendanceRate >= 75 ? "bg-green-500" : "bg-red-500"}`} style={{ width: `${attendanceRate}%` }} /></div>{attendanceRate < 75 && <p className="text-xs text-red-500 mt-2">⚠️ نسبة حضورك أقل من 75% المطلوبة</p>}</div>}
            {attendance.length === 0 ? <div className="bg-white rounded-xl p-8 text-center border"><p className="text-[var(--text-gray)]">لا يوجد سجل حضور بعد</p></div> : (
              <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100"><h3 className="font-bold text-sm text-[var(--primary)]">سجل الجلسات</h3></div>
                <div className="divide-y divide-gray-50">
                  {[...attendance].sort((a, b) => new Date(b.session_date).getTime() - new Date(a.session_date).getTime()).map(a => {
                    const sec = sections.find(s => s.id === a.section_id);
                    return <div key={a.id} className="flex items-center justify-between px-5 py-3"><div><p className="text-sm font-medium">{new Date(a.session_date).toLocaleDateString("ar", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p><p className="text-xs text-[var(--text-gray)]">{sec?.name || "—"}</p></div><span className={`px-3 py-1 rounded-full text-xs font-bold ${a.status === "present" ? "bg-green-100 text-green-700" : a.status === "late" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>{a.status === "present" ? "✓ حاضر" : a.status === "late" ? "⏰ متأخر" : "✗ غائب"}</span></div>;
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "evaluations" && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-[var(--primary)]">⭐ تقييماتي ({evaluations.length})</h2>
            {avgScore !== null && <div className="bg-white rounded-xl p-5 border border-gray-100"><div className="flex items-center justify-between mb-2"><span className="text-sm font-bold">متوسط الدرجات</span><span className={`text-2xl font-bold ${avgScore >= 75 ? "text-green-600" : avgScore >= 50 ? "text-amber-600" : "text-red-600"}`}>{avgScore}%</span></div><div className="w-full bg-gray-100 rounded-full h-3"><div className={`h-3 rounded-full ${avgScore >= 75 ? "bg-green-500" : avgScore >= 50 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${avgScore}%` }} /></div></div>}
            {evaluations.length === 0 ? <div className="bg-white rounded-xl p-8 text-center border"><p className="text-4xl mb-3">⭐</p><p className="text-[var(--text-gray)]">لا توجد تقييمات بعد</p></div>
            : evaluations.map(e => { const sec = sections.find(s => s.id === e.section_id); const pct = Math.round((e.score / e.max_score) * 100); return <div key={e.id} className="bg-white rounded-xl p-5 border border-gray-100"><div className="flex justify-between items-start mb-3"><div><p className="font-bold text-sm">{sec?.name || "تقييم عام"}</p><p className="text-xs text-[var(--text-gray)]">{new Date(e.created_at).toLocaleDateString("ar")}</p></div><div className="text-right"><p className={`text-2xl font-bold ${pct >= 75 ? "text-green-600" : pct >= 50 ? "text-amber-600" : "text-red-600"}`}>{e.score}/{e.max_score}</p><p className="text-xs text-[var(--text-gray)]">{pct}%</p></div></div><div className="w-full bg-gray-100 rounded-full h-2"><div className={`h-2 rounded-full ${pct >= 75 ? "bg-green-500" : pct >= 50 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${pct}%` }} /></div>{e.notes && <p className="text-sm text-[var(--text-gray)] mt-3 p-3 bg-gray-50 rounded-lg">💬 {e.notes}</p>}</div>; })}
          </div>
        )}

        {activeTab === "profile" && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-[var(--primary)]">👤 بياناتي</h2>
            <div className="bg-white rounded-xl p-6 border border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-4">
              {[{ label: "الاسم الكامل", value: fullName }, { label: "البريد الإلكتروني", value: user.email }, { label: "الهاتف", value: user.phone }, { label: "الجنسية", value: user.nationality }, { label: "بلد الإقامة", value: user.residenceCountry }, { label: "تلقرام", value: user.telegram }].map((f, i) => <div key={i} className="p-3 bg-gray-50 rounded-xl"><p className="text-xs text-[var(--text-gray)]">{f.label}</p><p className="font-medium text-[var(--text-dark)] mt-0.5">{f.value || "—"}</p></div>)}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}