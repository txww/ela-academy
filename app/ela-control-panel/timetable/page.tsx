"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { clearSession } from "@/lib/auth";

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || "http://localhost:1337";
const ADMIN_EMAIL = "admin@ela.com";
const getJwt = () => localStorage.getItem("jwt") || "";

const DAYS = [
  { key: "sat", label: "السبت", group: "SMW" },
  { key: "sun", label: "الأحد", group: "STT" },
  { key: "mon", label: "الاثنين", group: "SMW" },
  { key: "tue", label: "الثلاثاء", group: "STT" },
  { key: "wed", label: "الأربعاء", group: "SMW" },
  { key: "thu", label: "الخميس", group: "STT" },
];

const LEVELS: Record<string, string> = {
  intro: "Zero", level1: "Level 1", level2: "Level 2",
  level3: "Level 3", conversation: "Conv",
};

const LEVEL_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  intro:        { bg: "bg-blue-100",   text: "text-blue-800",   border: "border-blue-300" },
  level1:       { bg: "bg-green-100",  text: "text-green-800",  border: "border-green-300" },
  level2:       { bg: "bg-purple-100", text: "text-purple-800", border: "border-purple-300" },
  level3:       { bg: "bg-orange-100", text: "text-orange-800", border: "border-orange-300" },
  conversation: { bg: "bg-pink-100",   text: "text-pink-800",   border: "border-pink-300" },
};

interface Section {
  id: number; name: string; level: string; sub_level: string;
  teacher_id: number | null; max_students: number; is_active: boolean;
  zoom_link: string | null; schedule: string | null;
}
interface SectionStudent { id: number; section_id: number; student_id: number; }
interface Teacher { id: number; firstName?: string; lastName?: string; isTeacher?: boolean; }

// Parse time string like "9:00", "9:00 P.M", "9:00 PM", "21:00"
function parseTime(timeStr: string): number {
  if (!timeStr) return -1;
  const cleaned = timeStr.trim().toUpperCase();
  const match = cleaned.match(/(\d{1,2}):(\d{2})\s*(A\.?M\.?|P\.?M\.?)?/);
  if (!match) return -1;
  let hours = parseInt(match[1]);
  const mins = parseInt(match[2]);
  const period = match[3]?.replace(/\./g, "");
  if (period === "PM" && hours !== 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;
  return hours * 60 + mins;
}

// Detect group and time from schedule string
function parseSchedule(schedule: string | null): { group: "SMW" | "STT" | null; timeMinutes: number; timeLabel: string } {
  if (!schedule) return { group: null, timeMinutes: -1, timeLabel: "" };
  const upper = schedule.toUpperCase();
  let group: "SMW" | "STT" | null = null;
  if (upper.includes("SMW") || upper.includes("SAT") || upper.includes("MON") || upper.includes("WED")) group = "SMW";
  else if (upper.includes("STT") || upper.includes("SUN") || upper.includes("TUE") || upper.includes("THU")) group = "STT";
  else if (upper.includes("SUNDAY") || upper.includes("TUESDAY") || upper.includes("THURSDAY")) group = "STT";
  else if (upper.includes("SATURDAY") || upper.includes("MONDAY") || upper.includes("WEDNESDAY")) group = "SMW";

  const timeMatch = schedule.match(/(\d{1,2}:\d{2}\s*(?:A\.?M\.?|P\.?M\.?)?)/i);
  const timeLabel = timeMatch ? timeMatch[1].trim() : "";
  const timeMinutes = parseTime(timeLabel);
  return { group, timeMinutes, timeLabel };
}

// Generate time slots from 8:00 to 23:00
function generateTimeSlots(): { label: string; minutes: number }[] {
  const slots = [];
  for (let h = 8; h <= 22; h++) {
    const label = h < 12 ? `${h}:00 AM` : h === 12 ? `12:00 PM` : `${h - 12}:00 PM`;
    slots.push({ label, minutes: h * 60 });
    if (h < 22) slots.push({ label: h < 12 ? `${h}:30 AM` : h === 12 ? `12:30 PM` : `${h - 12}:30 PM`, minutes: h * 60 + 30 });
  }
  return slots;
}

export default function TimetablePage() {
  const router = useRouter();
  const [sections, setSections] = useState<Section[]>([]);
  const [sectionStudents, setSectionStudents] = useState<SectionStudent[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [filterGroup, setFilterGroup] = useState<"all" | "SMW" | "STT">("all");

  const fetchData = useCallback(async () => {
    const jwt = getJwt();
    const [sectRes, ssRes, usersRes] = await Promise.all([
      fetch("/api/academy?table=sections").then(r => r.json()),
      fetch("/api/academy?table=section_students").then(r => r.json()),
      fetch(`${STRAPI_URL}/api/users?populate=*`, { headers: { Authorization: `Bearer ${jwt}` } }).then(r => r.json()),
    ]);
    setSections(Array.isArray(sectRes) ? sectRes.filter((s: Section) => s.is_active) : []);
    setSectionStudents(Array.isArray(ssRes) ? ssRes : []);
    setTeachers(Array.isArray(usersRes) ? usersRes.filter((u: Teacher) => u.isTeacher) : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    const jwt = getJwt();
    if (!jwt) { router.push("/login"); return; }
    fetch(`${STRAPI_URL}/api/users/me`, { headers: { Authorization: `Bearer ${jwt}` } })
      .then(r => r.json())
      .then(u => { if (u?.email !== ADMIN_EMAIL) { router.push("/login"); return; } fetchData(); })
      .catch(() => router.push("/login"));
  }, [router, fetchData]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-10 h-10 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin" /></div>;

  const timeSlots = generateTimeSlots();

  // Find conflicts: sections on same group with overlapping times
  const conflicts = new Set<number>();
  sections.forEach(s1 => {
    const p1 = parseSchedule(s1.schedule);
    if (p1.timeMinutes < 0 || !p1.group) return;
    sections.forEach(s2 => {
      if (s1.id >= s2.id) return;
      const p2 = parseSchedule(s2.schedule);
      if (p2.timeMinutes < 0 || !p2.group) return;
      if (p1.group === p2.group && Math.abs(p1.timeMinutes - p2.timeMinutes) < 90) {
        conflicts.add(s1.id);
        conflicts.add(s2.id);
      }
    });
  });

  const filteredSections = sections.filter(s => {
    if (filterGroup === "all") return true;
    const { group } = parseSchedule(s.schedule);
    return group === filterGroup;
  });

  // Group sections by time slot for grid view
  const getSectionsAtSlot = (dayGroup: "SMW" | "STT", slotMinutes: number) => {
    return filteredSections.filter(s => {
      const { group, timeMinutes } = parseSchedule(s.schedule);
      return group === dayGroup && timeMinutes >= slotMinutes && timeMinutes < slotMinutes + 30;
    });
  };

  const smwSections = filteredSections.filter(s => parseSchedule(s.schedule).group === "SMW");
  const sttSections = filteredSections.filter(s => parseSchedule(s.schedule).group === "STT");
  const unscheduled = filteredSections.filter(s => !parseSchedule(s.schedule).group);

  return (
    <div className="min-h-screen bg-[var(--soft-white)] pt-16">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[var(--primary)]">📅 جدول الشعب الأسبوعي</h1>
            <p className="text-sm text-[var(--text-gray)] mt-1">{sections.length} شعبة نشطة • {conflicts.size > 0 ? <span className="text-red-500 font-bold">⚠️ {conflicts.size} تضارب محتمل</span> : <span className="text-green-600">✅ لا يوجد تضارب</span>}</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => router.push("/ela-control-panel/students")} className="px-4 py-2 border border-gray-200 rounded-xl text-sm hover:bg-gray-50">← لوحة الإدارة</button>
            <select value={filterGroup} onChange={e => setFilterGroup(e.target.value as "all" | "SMW" | "STT")} className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white">
              <option value="all">كل الشعب</option>
              <option value="SMW">SMW (سبت-اثنين-أربعاء)</option>
              <option value="STT">STT (أحد-ثلاثاء-خميس)</option>
            </select>
            <button onClick={() => setView(view === "grid" ? "list" : "grid")} className="px-4 py-2 bg-[var(--primary)] text-white rounded-xl text-sm font-bold">
              {view === "grid" ? "📋 قائمة" : "📊 شبكة"}
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 mb-6">
          {Object.entries(LEVELS).map(([key, label]) => (
            <div key={key} className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold ${LEVEL_COLORS[key].bg} ${LEVEL_COLORS[key].text} ${LEVEL_COLORS[key].border}`}>
              <span>{label}</span>
            </div>
          ))}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold bg-red-100 text-red-700 border-red-300">⚠️ تضارب</div>
        </div>

        {view === "list" ? (
          /* LIST VIEW */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* SMW */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="p-4 bg-blue-600 text-white">
                <h2 className="font-bold text-lg">📘 SMW</h2>
                <p className="text-blue-100 text-sm">السبت — الاثنين — الأربعاء</p>
                <p className="text-blue-200 text-xs mt-1">{smwSections.length} شعبة</p>
              </div>
              <div className="divide-y divide-gray-50">
                {smwSections.sort((a, b) => parseSchedule(a.schedule).timeMinutes - parseSchedule(b.schedule).timeMinutes).map(sec => {
                  const { timeLabel } = parseSchedule(sec.schedule);
                  const teacher = teachers.find(t => t.id === sec.teacher_id);
                  const enrolled = sectionStudents.filter(ss => ss.section_id === sec.id).length;
                  const colors = LEVEL_COLORS[sec.level] || LEVEL_COLORS.intro;
                  const hasConflict = conflicts.has(sec.id);
                  return (
                    <div key={sec.id} className={`p-4 ${hasConflict ? "bg-red-50" : ""}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`px-2 py-1 rounded-lg text-xs font-bold border ${colors.bg} ${colors.text} ${colors.border}`}>
                            {LEVELS[sec.level]} {sec.sub_level}
                          </div>
                          <div>
                            <p className="font-bold text-sm text-[var(--text-dark)]">{sec.name}</p>
                            <p className="text-xs text-[var(--text-gray)]">👨‍🏫 {teacher ? `${teacher.firstName} ${teacher.lastName}` : "—"}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-[var(--primary)] text-sm">{timeLabel}</p>
                          <p className="text-xs text-[var(--text-gray)]">👥 {enrolled}/{sec.max_students}</p>
                          {hasConflict && <p className="text-xs text-red-500 font-bold">⚠️ تضارب</p>}
                        </div>
                      </div>
                      {sec.zoom_link && <a href={sec.zoom_link} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs text-blue-500 hover:underline">🔗 Zoom</a>}
                    </div>
                  );
                })}
                {smwSections.length === 0 && <div className="p-6 text-center text-[var(--text-gray)] text-sm">لا توجد شعب</div>}
              </div>
            </div>

            {/* STT */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="p-4 bg-purple-600 text-white">
                <h2 className="font-bold text-lg">📗 STT</h2>
                <p className="text-purple-100 text-sm">الأحد — الثلاثاء — الخميس</p>
                <p className="text-purple-200 text-xs mt-1">{sttSections.length} شعبة</p>
              </div>
              <div className="divide-y divide-gray-50">
                {sttSections.sort((a, b) => parseSchedule(a.schedule).timeMinutes - parseSchedule(b.schedule).timeMinutes).map(sec => {
                  const { timeLabel } = parseSchedule(sec.schedule);
                  const teacher = teachers.find(t => t.id === sec.teacher_id);
                  const enrolled = sectionStudents.filter(ss => ss.section_id === sec.id).length;
                  const colors = LEVEL_COLORS[sec.level] || LEVEL_COLORS.intro;
                  const hasConflict = conflicts.has(sec.id);
                  return (
                    <div key={sec.id} className={`p-4 ${hasConflict ? "bg-red-50" : ""}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`px-2 py-1 rounded-lg text-xs font-bold border ${colors.bg} ${colors.text} ${colors.border}`}>
                            {LEVELS[sec.level]} {sec.sub_level}
                          </div>
                          <div>
                            <p className="font-bold text-sm text-[var(--text-dark)]">{sec.name}</p>
                            <p className="text-xs text-[var(--text-gray)]">👨‍🏫 {teacher ? `${teacher.firstName} ${teacher.lastName}` : "—"}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-purple-600 text-sm">{timeLabel}</p>
                          <p className="text-xs text-[var(--text-gray)]">👥 {enrolled}/{sec.max_students}</p>
                          {hasConflict && <p className="text-xs text-red-500 font-bold">⚠️ تضارب</p>}
                        </div>
                      </div>
                      {sec.zoom_link && <a href={sec.zoom_link} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs text-blue-500 hover:underline">🔗 Zoom</a>}
                    </div>
                  );
                })}
                {sttSections.length === 0 && <div className="p-6 text-center text-[var(--text-gray)] text-sm">لا توجد شعب</div>}
              </div>
            </div>
          </div>
        ) : (
          /* GRID VIEW */
          <div className="space-y-8">
            {/* SMW Grid */}
            {(filterGroup === "all" || filterGroup === "SMW") && (
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="p-4 bg-blue-600 text-white flex justify-between items-center">
                  <div>
                    <h2 className="font-bold text-lg">📘 SMW — السبت / الاثنين / الأربعاء</h2>
                    <p className="text-blue-100 text-sm">كل جلسة 90 دقيقة</p>
                  </div>
                  <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-bold">{smwSections.length} شعبة</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[600px]">
                    <thead>
                      <tr className="bg-blue-50">
                        <th className="p-3 text-right text-xs font-bold text-[var(--text-gray)] w-24">الوقت</th>
                        <th className="p-3 text-center text-xs font-bold text-blue-700">السبت</th>
                        <th className="p-3 text-center text-xs font-bold text-blue-700">الاثنين</th>
                        <th className="p-3 text-center text-xs font-bold text-blue-700">الأربعاء</th>
                      </tr>
                    </thead>
                    <tbody>
                      {timeSlots.map((slot, i) => {
                        const slotSections = getSectionsAtSlot("SMW", slot.minutes);
                        if (slotSections.length === 0 && i % 2 !== 0) return null;
                        return (
                          <tr key={slot.minutes} className={`border-t border-gray-50 ${slotSections.length > 0 ? "bg-blue-50/30" : ""}`}>
                            <td className="p-2 text-xs text-[var(--text-gray)] font-medium w-24 border-r border-gray-100">
                              {slotSections.length > 0 ? <span className="font-bold text-blue-700">{slot.label}</span> : <span className="text-gray-300">{slot.label}</span>}
                            </td>
                            <td className="p-2 text-center" colSpan={3}>
                              {slotSections.length > 0 && (
                                <div className="flex flex-wrap gap-2 justify-center">
                                  {slotSections.map(sec => {
                                    const teacher = teachers.find(t => t.id === sec.teacher_id);
                                    const enrolled = sectionStudents.filter(ss => ss.section_id === sec.id).length;
                                    const colors = LEVEL_COLORS[sec.level] || LEVEL_COLORS.intro;
                                    const hasConflict = conflicts.has(sec.id);
                                    const isFull = enrolled >= sec.max_students;
                                    return (
                                      <div key={sec.id} className={`relative px-3 py-2 rounded-xl border-2 text-right min-w-[180px] ${hasConflict ? "border-red-400 bg-red-50" : colors.border + " " + colors.bg}`}>
                                        {hasConflict && <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] rounded-full w-5 h-5 flex items-center justify-center font-bold">!</span>}
                                        <div className="flex items-center justify-between mb-1">
                                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${colors.bg} ${colors.text}`}>{LEVELS[sec.level]} {sec.sub_level}</span>
                                          <span className={`text-[10px] font-bold ${isFull ? "text-red-600" : "text-green-600"}`}>{enrolled}/{sec.max_students}</span>
                                        </div>
                                        <p className={`text-xs font-bold ${hasConflict ? "text-red-700" : colors.text}`}>{sec.name}</p>
                                        {teacher && <p className="text-[10px] text-[var(--text-gray)]">👨‍🏫 {teacher.firstName}</p>}
                                        <p className="text-[10px] font-bold text-blue-600 mt-0.5">{parseSchedule(sec.schedule).timeLabel}</p>
                                        {sec.zoom_link && <a href={sec.zoom_link} target="_blank" rel="noreferrer" className="text-[10px] text-blue-500 hover:underline">🔗 Zoom</a>}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* STT Grid */}
            {(filterGroup === "all" || filterGroup === "STT") && (
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="p-4 bg-purple-600 text-white flex justify-between items-center">
                  <div>
                    <h2 className="font-bold text-lg">📗 STT — الأحد / الثلاثاء / الخميس</h2>
                    <p className="text-purple-100 text-sm">كل جلسة 90 دقيقة</p>
                  </div>
                  <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-bold">{sttSections.length} شعبة</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[600px]">
                    <thead>
                      <tr className="bg-purple-50">
                        <th className="p-3 text-right text-xs font-bold text-[var(--text-gray)] w-24">الوقت</th>
                        <th className="p-3 text-center text-xs font-bold text-purple-700">الأحد</th>
                        <th className="p-3 text-center text-xs font-bold text-purple-700">الثلاثاء</th>
                        <th className="p-3 text-center text-xs font-bold text-purple-700">الخميس</th>
                      </tr>
                    </thead>
                    <tbody>
                      {timeSlots.map((slot, i) => {
                        const slotSections = getSectionsAtSlot("STT", slot.minutes);
                        if (slotSections.length === 0 && i % 2 !== 0) return null;
                        return (
                          <tr key={slot.minutes} className={`border-t border-gray-50 ${slotSections.length > 0 ? "bg-purple-50/30" : ""}`}>
                            <td className="p-2 text-xs text-[var(--text-gray)] font-medium w-24 border-r border-gray-100">
                              {slotSections.length > 0 ? <span className="font-bold text-purple-700">{slot.label}</span> : <span className="text-gray-300">{slot.label}</span>}
                            </td>
                            <td className="p-2 text-center" colSpan={3}>
                              {slotSections.length > 0 && (
                                <div className="flex flex-wrap gap-2 justify-center">
                                  {slotSections.map(sec => {
                                    const teacher = teachers.find(t => t.id === sec.teacher_id);
                                    const enrolled = sectionStudents.filter(ss => ss.section_id === sec.id).length;
                                    const colors = LEVEL_COLORS[sec.level] || LEVEL_COLORS.intro;
                                    const hasConflict = conflicts.has(sec.id);
                                    const isFull = enrolled >= sec.max_students;
                                    return (
                                      <div key={sec.id} className={`relative px-3 py-2 rounded-xl border-2 text-right min-w-[180px] ${hasConflict ? "border-red-400 bg-red-50" : colors.border + " " + colors.bg}`}>
                                        {hasConflict && <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] rounded-full w-5 h-5 flex items-center justify-center font-bold">!</span>}
                                        <div className="flex items-center justify-between mb-1">
                                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${colors.bg} ${colors.text}`}>{LEVELS[sec.level]} {sec.sub_level}</span>
                                          <span className={`text-[10px] font-bold ${isFull ? "text-red-600" : "text-green-600"}`}>{enrolled}/{sec.max_students}</span>
                                        </div>
                                        <p className={`text-xs font-bold ${hasConflict ? "text-red-700" : colors.text}`}>{sec.name}</p>
                                        {teacher && <p className="text-[10px] text-[var(--text-gray)]">👨‍🏫 {teacher.firstName}</p>}
                                        <p className="text-[10px] font-bold text-purple-600 mt-0.5">{parseSchedule(sec.schedule).timeLabel}</p>
                                        {sec.zoom_link && <a href={sec.zoom_link} target="_blank" rel="noreferrer" className="text-[10px] text-blue-500 hover:underline">🔗 Zoom</a>}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Unscheduled */}
        {unscheduled.length > 0 && (
          <div className="mt-6 bg-white rounded-2xl border border-amber-200 overflow-hidden">
            <div className="p-4 bg-amber-50 border-b border-amber-100">
              <h3 className="font-bold text-amber-700">⚠️ شعب بدون جدول محدد ({unscheduled.length})</h3>
            </div>
            <div className="p-4 flex flex-wrap gap-3">
              {unscheduled.map(sec => {
                const colors = LEVEL_COLORS[sec.level] || LEVEL_COLORS.intro;
                const enrolled = sectionStudents.filter(ss => ss.section_id === sec.id).length;
                return (
                  <div key={sec.id} className={`px-3 py-2 rounded-xl border ${colors.border} ${colors.bg}`}>
                    <p className={`text-xs font-bold ${colors.text}`}>{sec.name}</p>
                    <p className="text-[10px] text-[var(--text-gray)]">{sec.schedule || "بدون جدول"} • 👥 {enrolled}/{sec.max_students}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Summary */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "إجمالي الشعب", value: sections.length, color: "text-[var(--primary)]", bg: "bg-blue-50" },
            { label: "SMW", value: smwSections.length, color: "text-blue-600", bg: "bg-blue-50" },
            { label: "STT", value: sttSections.length, color: "text-purple-600", bg: "bg-purple-50" },
            { label: "تضارب محتمل", value: conflicts.size, color: conflicts.size > 0 ? "text-red-600" : "text-green-600", bg: conflicts.size > 0 ? "bg-red-50" : "bg-green-50" },
          ].map((s, i) => (
            <div key={i} className={`${s.bg} rounded-xl p-4 border border-gray-100 text-center`}>
              <p className="text-xs text-[var(--text-gray)]">{s.label}</p>
              <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}