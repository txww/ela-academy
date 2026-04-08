"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { clearSession } from "@/lib/auth";

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || "http://localhost:1337";
const ADMIN_EMAIL = "admin@ela.com";
const getJwt = () => localStorage.getItem("jwt") || "";

const LEVELS = [
  { value: "intro", label: "Intro (0)" }, { value: "level1", label: "Level 1" },
  { value: "level2", label: "Level 2" }, { value: "level3", label: "Level 3" },
  { value: "conversation", label: "Conversation" },
];
const SUB_LEVELS = ["A", "B"];

interface User {
  id: number; email: string; firstName?: string; lastName?: string; phone?: string;
  nationality?: string; residenceCountry?: string; telegram?: string; gender?: string;
  registrationStatus?: string; academicYear?: string; isTeacher?: boolean;
  teacherSubject?: string; birthDate?: string; is_archived?: boolean;
  howDidYouKnow?: string; educationLevel?: string; availableHours?: string;
  worksFullTime?: boolean; otherInstitutes?: boolean;
}
interface Section {
  id: number; name: string; level: string; sub_level: string; teacher_id: number | null;
  max_students: number; is_active: boolean; zoom_link: string | null; schedule: string | null;
}
interface SectionStudent { id: number; section_id: number; student_id: number; }
interface Assignment { id: number; section_id: number; teacher_id: number; title: string; description: string | null; due_date: string | null; }
interface Payment { id: number; student_id: number; amount: number; currency: string; type: string; status: string; notes: string | null; payment_date: string; }
interface WaitlistEntry { id: number; firstName: string; lastName: string; email: string; phone: string; interest_level: string; expected_date: string | null; notes: string | null; created_at: string; }
interface CalendarEvent { id: number; title: string; date: string; end_date: string | null; type: string; section_id: number | null; description: string | null; color: string; }

const api = async (table: string, params?: Record<string, string>) => {
  const qs = new URLSearchParams({ table, ...params }).toString();
  const res = await fetch(`/api/academy?${qs}`);
  const d = await res.json(); return Array.isArray(d) ? d : [];
};
const apiPost = async (table: string, data: Record<string, unknown>) =>
  fetch("/api/academy", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ table, ...data }) }).then(r => r.json());
const apiPut = async (table: string, id: number, data: Record<string, unknown>) =>
  fetch("/api/academy", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ table, id, ...data }) }).then(r => r.json());
const apiDelete = async (table: string, id: number) =>
  fetch(`/api/academy?table=${table}&id=${id}`, { method: "DELETE" }).then(r => r.json());

export default function AdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [sectionStudents, setSectionStudents] = useState<SectionStudent[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [msg, setMsg] = useState("");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedStudent, setSelectedStudent] = useState<User | null>(null);
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  const [sectionForm, setSectionForm] = useState({ name: "", level: "intro", sub_level: "A", teacher_id: "", max_students: "7", zoom_link: "", schedule: "" });
  const [teacherForm, setTeacherForm] = useState({ firstName: "", lastName: "", email: "", password: "", teacherSubject: "" });
  const [paymentForm, setPaymentForm] = useState({ student_id: "", amount: "", currency: "USD", type: "subscription", status: "paid", notes: "", payment_date: "" });
  const [waitlistForm, setWaitlistForm] = useState({ firstName: "", lastName: "", email: "", phone: "", interest_level: "medium", expected_date: "", notes: "" });
  const [eventForm, setEventForm] = useState({ title: "", date: "", end_date: "", type: "class", section_id: "", description: "", color: "#1B2A6B" });

  const fetchAll = useCallback(async () => {
    const jwt = getJwt();
    const [usersRes, sectionsRes, ssRes, assignRes, paymentsRes, waitlistRes, eventsRes] = await Promise.all([
      fetch(`${STRAPI_URL}/api/users?populate=*`, { headers: { Authorization: `Bearer ${jwt}` } }).then(r => r.json()),
      api("sections"), api("section_students"), api("assignments"),
      api("payments"), api("waitlist"), api("calendar_events"),
    ]);
    setUsers(Array.isArray(usersRes) ? usersRes : []);
    setSections(Array.isArray(sectionsRes) ? sectionsRes : []);
    setSectionStudents(Array.isArray(ssRes) ? ssRes : []);
    setAssignments(Array.isArray(assignRes) ? assignRes : []);
    setPayments(Array.isArray(paymentsRes) ? paymentsRes : []);
    setWaitlist(Array.isArray(waitlistRes) ? waitlistRes : []);
    setCalendarEvents(Array.isArray(eventsRes) ? eventsRes : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    const jwt = getJwt();
    if (!jwt) { router.push("/login"); return; }
    fetch(`${STRAPI_URL}/api/users/me`, { headers: { Authorization: `Bearer ${jwt}` } })
      .then(r => r.json()).then(u => { if (u?.email !== ADMIN_EMAIL) { router.push("/login"); return; } fetchAll(); })
      .catch(() => router.push("/login"));
  }, [router, fetchAll]);

  const students = users.filter(u => !u.isTeacher && u.email !== ADMIN_EMAIL && !u.is_archived);
  const archivedStudents = users.filter(u => !u.isTeacher && u.email !== ADMIN_EMAIL && u.is_archived);
  const teachers = users.filter(u => u.isTeacher);
  const pending = students.filter(s => s.registrationStatus === "pending").length;
  const approved = students.filter(s => s.registrationStatus === "approved").length;
  const totalRevenue = payments.filter(p => p.status === "paid").reduce((acc, p) => acc + Number(p.amount), 0);

  const updateUser = async (id: number, data: Record<string, unknown>) => {
    await fetch(`${STRAPI_URL}/api/users/${id}`, {
      method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${getJwt()}` },
      body: JSON.stringify(data),
    });
    fetchAll();
  };

  const addTeacher = async () => {
    if (!teacherForm.firstName || !teacherForm.email || !teacherForm.password) { setMsg("❌ يرجى ملء الحقول المطلوبة"); return; }
    try {
      const reg = await fetch(`${STRAPI_URL}/api/auth/local/register`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: teacherForm.email, email: teacherForm.email, password: teacherForm.password }),
      });
      const regData = await reg.json();
      if (!reg.ok) { setMsg(regData?.error?.message || "❌ خطأ"); return; }
      await fetch(`${STRAPI_URL}/api/users/${regData.user.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${getJwt()}` },
        body: JSON.stringify({ firstName: teacherForm.firstName, lastName: teacherForm.lastName, isTeacher: true, teacherSubject: teacherForm.teacherSubject, registrationStatus: "approved" }),
      });
      setMsg("✅ تم إنشاء المدرس"); setTeacherForm({ firstName: "", lastName: "", email: "", password: "", teacherSubject: "" }); fetchAll();
    } catch { setMsg("❌ خطأ في الاتصال"); }
  };

  const addSection = async () => {
    if (!sectionForm.name) { setMsg("❌ يرجى ملء اسم الشعبة"); return; }
    await apiPost("sections", { ...sectionForm, teacher_id: sectionForm.teacher_id ? parseInt(sectionForm.teacher_id) : null, max_students: parseInt(sectionForm.max_students) });
    setMsg("✅ تم إنشاء الشعبة"); setSectionForm({ name: "", level: "intro", sub_level: "A", teacher_id: "", max_students: "7", zoom_link: "", schedule: "" }); fetchAll();
  };

  const saveEditSection = async () => {
    if (!editingSection) return;
    await apiPut("sections", editingSection.id, editingSection);
    setMsg("✅ تم حفظ التعديلات"); setEditingSection(null); fetchAll();
  };

  const enrollStudent = async (sectionId: number, studentId: number) => {
    const student = students.find(s => s.id === studentId);
    if (!student || student.registrationStatus !== "approved") { setMsg("❌ يمكن تسجيل الطلاب المقبولين فقط"); return; }
    const count = sectionStudents.filter(ss => ss.section_id === sectionId).length;
    const section = sections.find(s => s.id === sectionId);
    if (section && count >= section.max_students) { setMsg(`❌ الشعبة ممتلئة`); return; }
    await apiPost("section_students", { section_id: sectionId, student_id: studentId });
    setMsg("✅ تم التسجيل"); fetchAll();
  };

  const addPayment = async () => {
    if (!paymentForm.student_id || !paymentForm.amount) { setMsg("❌ يرجى ملء الحقول المطلوبة"); return; }
    await apiPost("payments", { ...paymentForm, payment_date: paymentForm.payment_date || new Date().toISOString() });
    setMsg("✅ تم تسجيل الدفعة"); setPaymentForm({ student_id: "", amount: "", currency: "USD", type: "subscription", status: "paid", notes: "", payment_date: "" }); fetchAll();
  };

  const addWaitlist = async () => {
    if (!paymentForm.student_id) { /* skip */ }
    await apiPost("waitlist", waitlistForm);
    setMsg("✅ تم إضافة للقائمة"); setWaitlistForm({ firstName: "", lastName: "", email: "", phone: "", interest_level: "medium", expected_date: "", notes: "" }); fetchAll();
  };

  const addEvent = async () => {
    if (!eventForm.title || !eventForm.date) { setMsg("❌ يرجى ملء العنوان والتاريخ"); return; }
    await apiPost("calendar_events", { ...eventForm, section_id: eventForm.section_id ? parseInt(eventForm.section_id) : null });
    setMsg("✅ تم إضافة الحدث"); setEventForm({ title: "", date: "", end_date: "", type: "class", section_id: "", description: "", color: "#1B2A6B" }); fetchAll();
  };

  const filtered = students.filter(s => {
    const name = `${s.firstName || ""} ${s.lastName || ""} ${s.email}`.toLowerCase();
    if (search && !name.includes(search.toLowerCase())) return false;
    if (filterStatus !== "all" && s.registrationStatus !== filterStatus) return false;
    return true;
  });

  const handleLogout = () => { clearSession(); router.push("/"); };

  // Calendar helpers
  const getDaysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  const getEventsForDay = (day: number) => calendarEvents.filter(e => {
    const d = new Date(e.date);
    return d.getFullYear() === calendarMonth.getFullYear() && d.getMonth() === calendarMonth.getMonth() && d.getDate() === day;
  });

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-10 h-10 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin" /></div>;

  const inputCls = "w-full px-4 py-3 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-[var(--primary-light)] focus:bg-white transition";
  const selectCls = inputCls + " appearance-none";
  const btnPrimary = "px-5 py-2.5 bg-[var(--primary)] text-white rounded-xl font-bold hover:bg-[var(--primary-dark)] transition text-sm";
  const btnSuccess = "px-3 py-1 bg-green-500 text-white text-xs rounded-lg font-bold hover:bg-green-600";
  const btnDanger = "px-3 py-1 bg-red-500 text-white text-xs rounded-lg font-bold hover:bg-red-600";

  const tabs = [
    { id: "overview", label: "نظرة عامة", icon: "📊" },
    { id: "students", label: "الطلاب", icon: "🎓", badge: pending },
    { id: "archived", label: "المؤرشف", icon: "🗂️", badge: archivedStudents.length },
    { id: "waitlist", label: "قائمة الانتظار", icon: "⏳", badge: waitlist.length },
    { id: "teachers", label: "المدرسون", icon: "👨‍🏫" },
    { id: "sections", label: "الشعب", icon: "📚" },
    { id: "finance", label: "المالية", icon: "💰" },
    { id: "calendar", label: "الكالندر", icon: "📅" },
    { id: "assignments", label: "الواجبات", icon: "📝" },
  ];

  const eventTypes = [
    { value: "class", label: "حصة دراسية", color: "#1B2A6B" },
    { value: "placement", label: "تحديد المستوى", color: "#7C3AED" },
    { value: "meeting", label: "اجتماع", color: "#059669" },
    { value: "exam", label: "اختبار", color: "#DC2626" },
    { value: "other", label: "أخرى", color: "#D97706" },
  ];

  return (
    <div className="min-h-screen bg-[var(--soft-white)] flex pt-16">
      {/* Student Detail Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setSelectedStudent(null)}>
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-[var(--primary)]/10 flex items-center justify-center text-2xl font-bold text-[var(--primary)]">{(selectedStudent.firstName || selectedStudent.email)[0]?.toUpperCase()}</div>
                <div>
                  <h2 className="text-xl font-bold">{selectedStudent.firstName} {selectedStudent.lastName}</h2>
                  <p className="text-sm text-[var(--text-gray)]">{selectedStudent.email}</p>
                  <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-bold ${selectedStudent.registrationStatus === "approved" ? "bg-green-100 text-green-700" : selectedStudent.registrationStatus === "rejected" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                    {selectedStudent.registrationStatus === "approved" ? "✅ مقبول" : selectedStudent.registrationStatus === "rejected" ? "❌ مرفوض" : "⏳ بانتظار"}
                  </span>
                </div>
              </div>
              <button onClick={() => setSelectedStudent(null)} className="text-gray-400 hover:text-gray-600 text-2xl">✕</button>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6">
              {[
                { label: "الهاتف", value: selectedStudent.phone },
                { label: "الجنسية", value: selectedStudent.nationality },
                { label: "بلد الإقامة", value: selectedStudent.residenceCountry },
                { label: "تلقرام", value: selectedStudent.telegram },
                { label: "الجنس", value: selectedStudent.gender === "male" ? "ذكر" : selectedStudent.gender === "female" ? "أنثى" : "—" },
                { label: "تاريخ الميلاد", value: selectedStudent.birthDate ? new Date(selectedStudent.birthDate).toLocaleDateString("ar") : "—" },
                { label: "المؤهل التعليمي", value: selectedStudent.educationLevel },
                { label: "كيف عرف الأكاديمية", value: selectedStudent.howDidYouKnow },
                { label: "الساعات المتاحة", value: selectedStudent.availableHours },
                { label: "يعمل بدوام كامل", value: selectedStudent.worksFullTime ? "نعم" : "لا" },
              ].map((f, i) => (
                <div key={i} className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-xs text-[var(--text-gray)]">{f.label}</p>
                  <p className="font-medium text-sm mt-0.5">{f.value || "—"}</p>
                </div>
              ))}
            </div>

            {/* Student sections */}
            <div className="mb-4">
              <p className="font-bold text-sm text-[var(--primary)] mb-2">📚 الشعب المسجل فيها:</p>
              {sectionStudents.filter(ss => ss.student_id === selectedStudent.id).map(ss => {
                const sec = sections.find(s => s.id === ss.section_id);
                return sec ? <span key={ss.id} className="inline-block px-3 py-1 bg-blue-50 text-blue-700 text-xs rounded-full mr-2 mb-2">{sec.name} ({LEVELS.find(l => l.value === sec.level)?.label} {sec.sub_level})</span> : null;
              })}
              {sectionStudents.filter(ss => ss.student_id === selectedStudent.id).length === 0 && <p className="text-xs text-[var(--text-gray)]">غير مسجل في أي شعبة</p>}
            </div>

            {/* Student payments */}
            <div className="mb-4">
              <p className="font-bold text-sm text-[var(--primary)] mb-2">💰 الدفعات:</p>
              {payments.filter(p => p.student_id === selectedStudent.id).map(p => (
                <div key={p.id} className="flex justify-between items-center p-2 bg-green-50 rounded-lg mb-1">
                  <span className="text-sm">{p.type === "subscription" ? "اشتراك" : p.type === "trial" ? "تجربة" : p.type}</span>
                  <span className="font-bold text-green-700">{p.amount} {p.currency}</span>
                </div>
              ))}
              {payments.filter(p => p.student_id === selectedStudent.id).length === 0 && <p className="text-xs text-[var(--text-gray)]">لا توجد دفعات</p>}
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-100">
              {selectedStudent.registrationStatus === "pending" && (
                <><button onClick={() => { updateUser(selectedStudent.id, { registrationStatus: "approved" }); setSelectedStudent(null); }} className={btnSuccess}>✓ قبول</button>
                <button onClick={() => { updateUser(selectedStudent.id, { registrationStatus: "rejected" }); setSelectedStudent(null); }} className={btnDanger}>✗ رفض</button></>
              )}
              <button onClick={() => { updateUser(selectedStudent.id, { is_archived: true }); setSelectedStudent(null); setMsg("✅ تم أرشفة الطالب"); }} className="px-3 py-1 bg-gray-500 text-white text-xs rounded-lg font-bold hover:bg-gray-600">🗂️ أرشفة</button>
              <select onChange={e => { if (e.target.value) { enrollStudent(parseInt(e.target.value), selectedStudent.id); setSelectedStudent(null); } e.target.value = ""; }} className="px-2 py-1 border border-gray-200 rounded text-xs bg-white">
                <option value="">تسجيل في شعبة...</option>
                {sections.filter(sec => sec.is_active).map(sec => <option key={sec.id} value={sec.id}>{sec.name} [{sectionStudents.filter(ss => ss.section_id === sec.id).length}/{sec.max_students}]</option>)}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Edit Section Modal */}
      {editingSection && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setEditingSection(null)}>
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg text-[var(--primary)]">تعديل الشعبة</h3>
              <button onClick={() => setEditingSection(null)} className="text-gray-400 text-xl">✕</button>
            </div>
            <div className="space-y-3">
              <input value={editingSection.name} onChange={e => setEditingSection({...editingSection, name: e.target.value})} placeholder="اسم الشعبة" className={inputCls} />
              <select value={editingSection.level} onChange={e => setEditingSection({...editingSection, level: e.target.value})} className={selectCls}>
                {LEVELS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
              <select value={editingSection.sub_level} onChange={e => setEditingSection({...editingSection, sub_level: e.target.value})} className={selectCls}>
                {SUB_LEVELS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <select value={editingSection.teacher_id || ""} onChange={e => setEditingSection({...editingSection, teacher_id: e.target.value ? parseInt(e.target.value) : null})} className={selectCls}>
                <option value="">بدون مدرس</option>
                {teachers.map(t => <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>)}
              </select>
              <input type="number" value={editingSection.max_students} onChange={e => setEditingSection({...editingSection, max_students: parseInt(e.target.value)})} placeholder="الحد الأقصى" className={inputCls} />
              <input value={editingSection.zoom_link || ""} onChange={e => setEditingSection({...editingSection, zoom_link: e.target.value})} placeholder="رابط Zoom" className={inputCls} />
              <input value={editingSection.schedule || ""} onChange={e => setEditingSection({...editingSection, schedule: e.target.value})} placeholder="الجدول" className={inputCls} />
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={saveEditSection} className={btnPrimary}>💾 حفظ التعديلات</button>
              <button onClick={() => setEditingSection(null)} className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm">إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 right-0 z-40 w-64 bg-[var(--primary-dark)] text-white transform transition-transform duration-300 md:translate-x-0 md:static md:pt-0 pt-16 ${sidebarOpen ? "translate-x-0" : "translate-x-full md:translate-x-0"}`}>
        <div className="p-5 border-b border-white/10">
          <h3 className="font-bold text-lg">🏛️ لوحة الإدارة</h3>
          <p className="text-blue-200/60 text-xs mt-1">E.L.A Academy</p>
        </div>
        <div className="p-4 border-b border-white/10 space-y-1.5 text-xs">
          <div className="flex justify-between"><span className="text-blue-200/60">الطلاب</span><span className="font-bold">{students.length}</span></div>
          <div className="flex justify-between"><span className="text-amber-300">⏳ بانتظار</span><span className="font-bold">{pending}</span></div>
          <div className="flex justify-between"><span className="text-green-300">✅ مقبول</span><span className="font-bold">{approved}</span></div>
          <div className="flex justify-between"><span className="text-blue-200/60">👨‍🏫 مدرسون</span><span className="font-bold">{teachers.length}</span></div>
          <div className="flex justify-between"><span className="text-blue-200/60">📚 شعب</span><span className="font-bold">{sections.length}</span></div>
          <div className="flex justify-between"><span className="text-green-300">💰 إجمالي</span><span className="font-bold text-green-300">${totalRevenue}</span></div>
        </div>
        <nav className="p-3 space-y-0.5 overflow-y-auto">
          {tabs.map(t => (
            <button key={t.id} onClick={() => { setActiveTab(t.id); setSidebarOpen(false); setMsg(""); }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition ${activeTab === t.id ? "bg-white/10 text-white" : "text-blue-200/60 hover:text-white hover:bg-white/5"}`}>
              <span className="flex items-center gap-2"><span>{t.icon}</span>{t.label}</span>
              {t.badge ? <span className="bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{t.badge}</span> : null}
            </button>
          ))}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-red-300 hover:bg-red-500/10 transition">🚪 خروج</button>
        </div>
      </aside>

      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => setSidebarOpen(false)} />}

      <main className="flex-1 p-6 md:p-8 overflow-y-auto">
        <button onClick={() => setSidebarOpen(true)} className="md:hidden mb-4 p-2 bg-white rounded-lg shadow-sm">
          <svg className="w-6 h-6 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>
        {msg && <div className={`mb-4 p-3 rounded-xl text-sm font-medium ${msg.includes("✅") ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>{msg}</div>}

        {/* OVERVIEW */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-[var(--primary)]">📊 نظرة عامة</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "إجمالي الطلاب", value: students.length, color: "text-[var(--primary)]", bg: "bg-blue-50" },
                { label: "بانتظار الموافقة", value: pending, color: "text-amber-600", bg: "bg-amber-50" },
                { label: "مقبولون", value: approved, color: "text-green-600", bg: "bg-green-50" },
                { label: "قائمة الانتظار", value: waitlist.length, color: "text-purple-600", bg: "bg-purple-50" },
                { label: "المدرسون", value: teachers.length, color: "text-indigo-600", bg: "bg-indigo-50" },
                { label: "الشعب النشطة", value: sections.filter(s => s.is_active).length, color: "text-blue-600", bg: "bg-blue-50" },
                { label: "المؤرشفون", value: archivedStudents.length, color: "text-gray-600", bg: "bg-gray-50" },
                { label: "إجمالي الإيرادات", value: `$${totalRevenue}`, color: "text-green-600", bg: "bg-green-50" },
              ].map((s, i) => (
                <div key={i} className={`${s.bg} rounded-xl p-5 border border-gray-100`}>
                  <p className="text-[var(--text-gray)] text-xs">{s.label}</p>
                  <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
                </div>
              ))}
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-6">
              <h3 className="font-bold text-[var(--primary)] mb-4">آخر المسجلين</h3>
              {students.slice(-5).reverse().map(s => (
                <div key={s.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg mb-2 cursor-pointer hover:bg-blue-50 transition" onClick={() => setSelectedStudent(s)}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[var(--primary)]/10 flex items-center justify-center text-xs font-bold text-[var(--primary)]">{(s.firstName || s.email)[0]?.toUpperCase()}</div>
                    <div><p className="text-sm font-medium">{s.firstName} {s.lastName}</p><p className="text-xs text-[var(--text-gray)]">{s.email}</p></div>
                  </div>
                  <div className="flex gap-2">
                    {s.registrationStatus === "pending" && <><button onClick={e => { e.stopPropagation(); updateUser(s.id, { registrationStatus: "approved" }); }} className={btnSuccess}>✓ قبول</button><button onClick={e => { e.stopPropagation(); updateUser(s.id, { registrationStatus: "rejected" }); }} className={btnDanger}>✗ رفض</button></>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STUDENTS */}
        {activeTab === "students" && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-[var(--primary)]">🎓 الطلاب ({filtered.length})</h2>
            <div className="flex flex-wrap gap-3">
              <input placeholder="بحث بالاسم أو الإيميل..." value={search} onChange={e => setSearch(e.target.value)} className="flex-1 min-w-[200px] px-4 py-2 border border-gray-200 rounded-lg text-sm bg-white" />
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white">
                <option value="all">كل الحالات</option><option value="pending">بانتظار</option><option value="approved">مقبول</option><option value="rejected">مرفوض</option>
              </select>
            </div>
            {filtered.map(s => (
              <div key={s.id} className="bg-white rounded-xl p-5 border border-gray-100 cursor-pointer hover:border-[var(--primary)]/30 hover:shadow-sm transition" onClick={() => setSelectedStudent(s)}>
                <div className="flex items-start justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[var(--primary)]/10 flex items-center justify-center font-bold text-[var(--primary)]">{(s.firstName || s.email)[0]?.toUpperCase()}</div>
                    <div>
                      <p className="font-bold">{s.firstName} {s.lastName}</p>
                      <p className="text-xs text-[var(--text-gray)]">{s.email} • {s.phone || "—"} • {s.residenceCountry || "—"}</p>
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {sectionStudents.filter(ss => ss.student_id === s.id).map(ss => {
                          const sec = sections.find(sec => sec.id === ss.section_id);
                          return sec ? <span key={ss.id} className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] rounded-full">{sec.name}</span> : null;
                        })}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap" onClick={e => e.stopPropagation()}>
                    <select onChange={e => { if (e.target.value) enrollStudent(parseInt(e.target.value), s.id); e.target.value = ""; }} className="px-2 py-1 border border-gray-200 rounded text-xs bg-white">
                      <option value="">تسجيل في شعبة...</option>
                      {sections.filter(sec => sec.is_active).map(sec => <option key={sec.id} value={sec.id}>{sec.name} [{sectionStudents.filter(ss => ss.section_id === sec.id).length}/{sec.max_students}]</option>)}
                    </select>
                    {s.registrationStatus === "pending" && <><button onClick={() => updateUser(s.id, { registrationStatus: "approved" })} className={btnSuccess}>✓ قبول</button><button onClick={() => updateUser(s.id, { registrationStatus: "rejected" })} className={btnDanger}>✗ رفض</button></>}
                    {s.registrationStatus === "approved" && <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full font-bold">✅ مقبول</span>}
                    {s.registrationStatus === "rejected" && <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full font-bold">❌ مرفوض</span>}
                    <button onClick={() => { updateUser(s.id, { is_archived: true }); setMsg("✅ تم الأرشفة"); }} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-lg hover:bg-gray-200">🗂️</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ARCHIVED */}
        {activeTab === "archived" && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-[var(--primary)]">🗂️ الطلاب المؤرشفون ({archivedStudents.length})</h2>
            {archivedStudents.length === 0 ? <div className="bg-white rounded-xl p-8 text-center border"><p className="text-[var(--text-gray)]">لا يوجد طلاب مؤرشفون</p></div>
            : archivedStudents.map(s => (
              <div key={s.id} className="bg-white rounded-xl p-5 border border-gray-100 opacity-75">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-500">{(s.firstName || s.email)[0]?.toUpperCase()}</div>
                    <div><p className="font-bold text-gray-600">{s.firstName} {s.lastName}</p><p className="text-xs text-[var(--text-gray)]">{s.email} • {s.phone || "—"}</p></div>
                  </div>
                  <button onClick={() => { updateUser(s.id, { is_archived: false }); setMsg("✅ تم استعادة الطالب"); }} className="px-3 py-1 bg-blue-500 text-white text-xs rounded-lg font-bold hover:bg-blue-600">↩️ استعادة</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* WAITLIST */}
        {activeTab === "waitlist" && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-[var(--primary)]">⏳ قائمة الانتظار</h2>
            <div className="bg-white rounded-xl p-6 border border-gray-100">
              <h3 className="font-bold text-[var(--primary)] mb-4">إضافة شخص للقائمة</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input placeholder="الاسم الأول" value={waitlistForm.firstName} onChange={e => setWaitlistForm({...waitlistForm, firstName: e.target.value})} className={inputCls} />
                <input placeholder="اسم العائلة" value={waitlistForm.lastName} onChange={e => setWaitlistForm({...waitlistForm, lastName: e.target.value})} className={inputCls} />
                <input placeholder="الإيميل" value={waitlistForm.email} onChange={e => setWaitlistForm({...waitlistForm, email: e.target.value})} className={inputCls} />
                <input placeholder="الهاتف" value={waitlistForm.phone} onChange={e => setWaitlistForm({...waitlistForm, phone: e.target.value})} className={inputCls} />
                <select value={waitlistForm.interest_level} onChange={e => setWaitlistForm({...waitlistForm, interest_level: e.target.value})} className={selectCls}>
                  <option value="high">اهتمام عالي 🔥</option>
                  <option value="medium">اهتمام متوسط</option>
                  <option value="low">اهتمام منخفض</option>
                </select>
                <input type="date" value={waitlistForm.expected_date} onChange={e => setWaitlistForm({...waitlistForm, expected_date: e.target.value})} className={inputCls} placeholder="تاريخ التسجيل المتوقع" />
                <textarea placeholder="ملاحظات" value={waitlistForm.notes} onChange={e => setWaitlistForm({...waitlistForm, notes: e.target.value})} className={inputCls + " md:col-span-2"} rows={2} />
              </div>
              <button onClick={addWaitlist} className={`mt-4 ${btnPrimary}`}>➕ إضافة للقائمة</button>
            </div>
            {waitlist.map(w => (
              <div key={w.id} className="bg-white rounded-xl p-5 border border-gray-100">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold">{w.firstName} {w.lastName}</p>
                    <p className="text-xs text-[var(--text-gray)]">{w.email} • {w.phone}</p>
                    {w.expected_date && <p className="text-xs text-blue-600 mt-1">📅 يتوقع التسجيل: {new Date(w.expected_date).toLocaleDateString("ar")}</p>}
                    {w.notes && <p className="text-xs text-[var(--text-gray)] mt-1">💬 {w.notes}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${w.interest_level === "high" ? "bg-red-100 text-red-600" : w.interest_level === "medium" ? "bg-amber-100 text-amber-600" : "bg-gray-100 text-gray-600"}`}>
                      {w.interest_level === "high" ? "🔥 عالي" : w.interest_level === "medium" ? "🟡 متوسط" : "⬇️ منخفض"}
                    </span>
                    <button onClick={() => apiDelete("waitlist", w.id).then(fetchAll)} className={btnDanger}>🗑</button>
                  </div>
                </div>
              </div>
            ))}
            {waitlist.length === 0 && <div className="bg-white rounded-xl p-8 text-center border"><p className="text-[var(--text-gray)]">قائمة الانتظار فارغة</p></div>}
          </div>
        )}

        {/* TEACHERS */}
        {activeTab === "teachers" && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-[var(--primary)]">👨‍🏫 المدرسون ({teachers.length})</h2>
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
                    <p className="text-xs text-blue-500">{sections.filter(s => s.teacher_id === t.id).length} شعبة • {sectionStudents.filter(ss => sections.filter(s => s.teacher_id === t.id).some(s => s.id === ss.section_id)).length} طالب</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* SECTIONS */}
        {activeTab === "sections" && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-[var(--primary)]">📚 الشعب والفصول</h2>
            <div className="bg-white rounded-xl p-6 border border-gray-100">
              <h3 className="font-bold text-[var(--primary)] mb-4">إنشاء شعبة جديدة</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input placeholder="اسم الشعبة *" value={sectionForm.name} onChange={e => setSectionForm({...sectionForm, name: e.target.value})} className={inputCls} />
                <select value={sectionForm.level} onChange={e => setSectionForm({...sectionForm, level: e.target.value})} className={selectCls}>{LEVELS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}</select>
                <select value={sectionForm.sub_level} onChange={e => setSectionForm({...sectionForm, sub_level: e.target.value})} className={selectCls}>{SUB_LEVELS.map(s => <option key={s} value={s}>{s}</option>)}</select>
                <select value={sectionForm.teacher_id} onChange={e => setSectionForm({...sectionForm, teacher_id: e.target.value})} className={selectCls}>
                  <option value="">اختر المدرس</option>
                  {teachers.map(t => <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>)}
                </select>
                <input type="number" placeholder="الحد الأقصى (7)" value={sectionForm.max_students} onChange={e => setSectionForm({...sectionForm, max_students: e.target.value})} className={inputCls} />
                <input placeholder="رابط Zoom" value={sectionForm.zoom_link} onChange={e => setSectionForm({...sectionForm, zoom_link: e.target.value})} className={inputCls} />
                <input placeholder="الجدول (مثال: الأحد والثلاثاء 7-8م)" value={sectionForm.schedule} onChange={e => setSectionForm({...sectionForm, schedule: e.target.value})} className={inputCls + " md:col-span-2"} />
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
                      <h3 className="font-bold text-[var(--primary)] text-lg">{sec.name}</h3>
                      <p className="text-xs text-[var(--text-gray)]">{LEVELS.find(l => l.value === sec.level)?.label} {sec.sub_level} • 👨‍🏫 {teacher ? `${teacher.firstName} ${teacher.lastName}` : "بدون مدرس"} • 👥 {secStudents.length}/{sec.max_students}</p>
                      {sec.schedule && <p className="text-xs text-blue-500 mt-1">🕐 {sec.schedule}</p>}
                      {sec.zoom_link && <a href={sec.zoom_link} target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline">🔗 Zoom</a>}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setEditingSection(sec)} className="px-3 py-1 bg-blue-100 text-blue-700 text-xs rounded-lg font-bold hover:bg-blue-200">✏️ تعديل</button>
                      <button onClick={() => apiPut("sections", sec.id, { is_active: !sec.is_active }).then(fetchAll)} className={`px-3 py-1 text-xs rounded-lg font-bold ${sec.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>{sec.is_active ? "نشطة ✓" : "معطلة"}</button>
                      <button onClick={() => { if(confirm("حذف الشعبة؟")) apiDelete("sections", sec.id).then(fetchAll); }} className={btnDanger}>🗑</button>
                    </div>
                  </div>
                  {secStudents.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <p className="text-xs font-bold text-[var(--text-gray)] mb-2">الطلاب المسجلون ({secStudents.length}):</p>
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

        {/* FINANCE */}
        {activeTab === "finance" && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-[var(--primary)]">💰 النظام المالي</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "إجمالي الإيرادات", value: `$${totalRevenue}`, color: "text-green-600", bg: "bg-green-50" },
                { label: "عدد الدفعات", value: payments.filter(p => p.status === "paid").length, color: "text-blue-600", bg: "bg-blue-50" },
                { label: "تجارب مجانية", value: payments.filter(p => p.type === "trial").length, color: "text-amber-600", bg: "bg-amber-50" },
                { label: "اشتراكات نشطة", value: payments.filter(p => p.type === "subscription" && p.status === "paid").length, color: "text-purple-600", bg: "bg-purple-50" },
              ].map((s, i) => <div key={i} className={`${s.bg} rounded-xl p-5 border border-gray-100`}><p className="text-xs text-[var(--text-gray)]">{s.label}</p><p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p></div>)}
            </div>
            <div className="bg-white rounded-xl p-6 border border-gray-100">
              <h3 className="font-bold text-[var(--primary)] mb-4">تسجيل دفعة جديدة</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <select value={paymentForm.student_id} onChange={e => setPaymentForm({...paymentForm, student_id: e.target.value})} className={selectCls}>
                  <option value="">اختر الطالب *</option>
                  {students.filter(s => s.registrationStatus === "approved").map(s => <option key={s.id} value={s.id}>{s.firstName} {s.lastName} — {s.email}</option>)}
                </select>
                <input type="number" step="0.01" placeholder="المبلغ *" value={paymentForm.amount} onChange={e => setPaymentForm({...paymentForm, amount: e.target.value})} className={inputCls} />
                <select value={paymentForm.currency} onChange={e => setPaymentForm({...paymentForm, currency: e.target.value})} className={selectCls}>
                  <option value="USD">USD دولار</option>
                  <option value="EUR">EUR يورو</option>
                  <option value="SAR">SAR ريال</option>
                  <option value="AED">AED درهم</option>
                </select>
                <select value={paymentForm.type} onChange={e => setPaymentForm({...paymentForm, type: e.target.value})} className={selectCls}>
                  <option value="subscription">اشتراك</option>
                  <option value="trial">تجربة مجانية</option>
                  <option value="partial">دفعة جزئية</option>
                  <option value="other">أخرى</option>
                </select>
                <select value={paymentForm.status} onChange={e => setPaymentForm({...paymentForm, status: e.target.value})} className={selectCls}>
                  <option value="paid">مدفوع ✅</option>
                  <option value="pending">معلق ⏳</option>
                  <option value="refunded">مسترد ↩️</option>
                </select>
                <input type="datetime-local" value={paymentForm.payment_date} onChange={e => setPaymentForm({...paymentForm, payment_date: e.target.value})} className={inputCls} />
                <textarea placeholder="ملاحظات" value={paymentForm.notes} onChange={e => setPaymentForm({...paymentForm, notes: e.target.value})} className={inputCls + " md:col-span-2"} rows={2} />
              </div>
              <button onClick={addPayment} className={`mt-4 ${btnPrimary}`}>💾 تسجيل الدفعة</button>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <div className="p-4 border-b border-gray-100"><h3 className="font-bold text-[var(--primary)]">سجل الدفعات</h3></div>
              {payments.length === 0 ? <div className="p-8 text-center"><p className="text-[var(--text-gray)]">لا توجد دفعات بعد</p></div>
              : <div className="divide-y divide-gray-50">
                {payments.map(p => {
                  const student = students.find(s => s.id === p.student_id) || archivedStudents.find(s => s.id === p.student_id);
                  return (
                    <div key={p.id} className="flex items-center justify-between px-5 py-3">
                      <div>
                        <p className="font-medium text-sm">{student ? `${student.firstName} ${student.lastName}` : `طالب #${p.student_id}`}</p>
                        <p className="text-xs text-[var(--text-gray)]">{p.type === "subscription" ? "اشتراك" : p.type === "trial" ? "تجربة" : p.type} • {new Date(p.payment_date).toLocaleDateString("ar")}</p>
                        {p.notes && <p className="text-xs text-[var(--text-gray)]">💬 {p.notes}</p>}
                      </div>
                      <div className="text-right">
                        <p className={`font-bold text-lg ${p.status === "paid" ? "text-green-600" : p.status === "pending" ? "text-amber-600" : "text-red-600"}`}>{p.amount} {p.currency}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${p.status === "paid" ? "bg-green-100 text-green-700" : p.status === "pending" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>
                          {p.status === "paid" ? "✅ مدفوع" : p.status === "pending" ? "⏳ معلق" : "↩️ مسترد"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>}
            </div>
          </div>
        )}

        {/* CALENDAR */}
        {activeTab === "calendar" && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-[var(--primary)]">📅 الكالندر والجدول</h2>
            <div className="bg-white rounded-xl p-6 border border-gray-100">
              <h3 className="font-bold text-[var(--primary)] mb-4">إضافة حدث جديد</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input placeholder="عنوان الحدث *" value={eventForm.title} onChange={e => setEventForm({...eventForm, title: e.target.value})} className={inputCls} />
                <select value={eventForm.type} onChange={e => { const et = eventTypes.find(t => t.value === e.target.value); setEventForm({...eventForm, type: e.target.value, color: et?.color || "#1B2A6B"}); }} className={selectCls}>
                  {eventTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                <input type="datetime-local" value={eventForm.date} onChange={e => setEventForm({...eventForm, date: e.target.value})} className={inputCls} />
                <input type="datetime-local" value={eventForm.end_date} onChange={e => setEventForm({...eventForm, end_date: e.target.value})} placeholder="وقت الانتهاء (اختياري)" className={inputCls} />
                <select value={eventForm.section_id} onChange={e => setEventForm({...eventForm, section_id: e.target.value})} className={selectCls}>
                  <option value="">شعبة (اختياري)</option>
                  {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <textarea placeholder="وصف (اختياري)" value={eventForm.description} onChange={e => setEventForm({...eventForm, description: e.target.value})} className={inputCls} rows={2} />
              </div>
              <button onClick={addEvent} className={`mt-4 ${btnPrimary}`}>➕ إضافة الحدث</button>
            </div>

            {/* Calendar Grid */}
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-gray-100">
                <button onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1))} className="px-3 py-1 hover:bg-gray-100 rounded-lg">◀</button>
                <h3 className="font-bold text-[var(--primary)]">
                  {calendarMonth.toLocaleDateString("ar", { month: "long", year: "numeric" })}
                </h3>
                <button onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1))} className="px-3 py-1 hover:bg-gray-100 rounded-lg">▶</button>
              </div>
              <div className="grid grid-cols-7 border-b border-gray-100">
                {["أحد", "اثن", "ثلا", "أرب", "خمي", "جمع", "سبت"].map(d => <div key={d} className="p-2 text-center text-xs font-bold text-[var(--text-gray)]">{d}</div>)}
              </div>
              <div className="grid grid-cols-7">
                {Array.from({ length: getFirstDayOfMonth(calendarMonth) }).map((_, i) => <div key={`empty-${i}`} className="p-2 min-h-[80px] border-b border-r border-gray-50" />)}
                {Array.from({ length: getDaysInMonth(calendarMonth) }).map((_, i) => {
                  const day = i + 1;
                  const dayEvents = getEventsForDay(day);
                  const isToday = new Date().getDate() === day && new Date().getMonth() === calendarMonth.getMonth() && new Date().getFullYear() === calendarMonth.getFullYear();
                  return (
                    <div key={day} className={`p-1 min-h-[80px] border-b border-r border-gray-50 ${isToday ? "bg-blue-50" : ""}`}>
                      <p className={`text-xs font-bold mb-1 w-6 h-6 flex items-center justify-center rounded-full ${isToday ? "bg-[var(--primary)] text-white" : "text-[var(--text-gray)]"}`}>{day}</p>
                      {dayEvents.map(e => (
                        <div key={e.id} className="text-[10px] px-1 py-0.5 rounded mb-0.5 text-white truncate cursor-pointer group relative" style={{ backgroundColor: e.color }}>
                          {e.title}
                          <button onClick={() => apiDelete("calendar_events", e.id).then(fetchAll)} className="absolute left-0 top-0 h-full px-1 bg-red-500 rounded opacity-0 group-hover:opacity-100 transition">✕</button>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Events list */}
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <div className="p-4 border-b border-gray-100"><h3 className="font-bold text-[var(--primary)]">قائمة الأحداث القادمة</h3></div>
              {calendarEvents.filter(e => new Date(e.date) >= new Date()).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map(e => {
                const sec = sections.find(s => s.id === e.section_id);
                return (
                  <div key={e.id} className="flex items-center justify-between px-5 py-3 border-b border-gray-50 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: e.color }} />
                      <div>
                        <p className="font-medium text-sm">{e.title}</p>
                        <p className="text-xs text-[var(--text-gray)]">{new Date(e.date).toLocaleString("ar", { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })} {sec ? `• ${sec.name}` : ""}</p>
                        {e.description && <p className="text-xs text-[var(--text-gray)]">{e.description}</p>}
                      </div>
                    </div>
                    <button onClick={() => apiDelete("calendar_events", e.id).then(fetchAll)} className="text-red-400 hover:text-red-600 text-xs px-2">🗑</button>
                  </div>
                );
              })}
              {calendarEvents.filter(e => new Date(e.date) >= new Date()).length === 0 && <div className="p-8 text-center"><p className="text-[var(--text-gray)]">لا توجد أحداث قادمة</p></div>}
            </div>
          </div>
        )}

        {/* ASSIGNMENTS */}
        {activeTab === "assignments" && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-[var(--primary)]">📝 الواجبات ({assignments.length})</h2>
            {assignments.length === 0 ? <div className="bg-white rounded-xl p-8 text-center border"><p className="text-[var(--text-gray)]">لا توجد واجبات — المدرسون يضيفونها من بوابتهم</p></div>
            : assignments.map(a => {
              const sec = sections.find(s => s.id === a.section_id);
              const teacher = teachers.find(t => t.id === a.teacher_id);
              return (
                <div key={a.id} className="bg-white rounded-xl p-5 border border-gray-100">
                  <h3 className="font-bold">{a.title}</h3>
                  <p className="text-xs text-[var(--text-gray)]">📚 {sec?.name || "—"} • 👨‍🏫 {teacher?.firstName || "—"} • 📅 {a.due_date ? new Date(a.due_date).toLocaleDateString("ar") : "بدون موعد"}</p>
                  {a.description && <p className="text-sm text-[var(--text-gray)] mt-2">{a.description}</p>}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}