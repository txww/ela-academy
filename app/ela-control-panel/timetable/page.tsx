"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || "http://localhost:1337";
const ADMIN_EMAIL = "admin@ela.com";
const getJwt = () => localStorage.getItem("jwt") || "";

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
  start_time: string | null; end_time: string | null; day_group: string | null;
}
interface SectionStudent { id: number; section_id: number; student_id: number; }
interface Teacher { id: number; firstName?: string; lastName?: string; isTeacher?: boolean; }

function toMins(t: string): number {
  if (!t) return -1;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function formatTime(t: string): string {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  if (h < 12) return `${h}:${String(m).padStart(2,"0")} AM`;
  if (h === 12) return `12:${String(m).padStart(2,"0")} PM`;
  return `${h-12}:${String(m).padStart(2,"0")} PM`;
}

// Generate time slots from 7:00 to 23:00 every 30 mins
function generateSlots() {
  const slots = [];
  for (let h = 7; h <= 23; h++) {
    for (const m of [0, 30]) {
      if (h === 23 && m === 30) break;
      slots.push({ label: formatTime(`${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`), minutes: h * 60 + m });
    }
  }
  return slots;
}

export default function TimetablePage() {
  const router = useRouter();
  const [sections, setSections] = useState<Section[]>([]);
  const [sectionStudents, setSectionStudents] = useState<SectionStudent[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);

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

  const slots = generateSlots();
  const smwSections = sections.filter(s => s.day_group === "SMW" && s.start_time).sort((a, b) => toMins(a.start_time!) - toMins(b.start_time!));
  const sttSections = sections.filter(s => s.day_group === "STT" && s.start_time).sort((a, b) => toMins(a.start_time!) - toMins(b.start_time!));

  // Find conflicts
  const conflicts = new Set<number>();
  const checkConflicts = (secs: Section[]) => {
    secs.forEach(s1 => {
      secs.forEach(s2 => {
        if (s1.id >= s2.id || !s1.start_time || !s2.start_time) return;
        const s1s = toMins(s1.start_time), s1e = toMins(s1.end_time || "");
        const s2s = toMins(s2.start_time), s2e = toMins(s2.end_time || "");
        if (s1s < s2e && s2s < s1e) { conflicts.add(s1.id); conflicts.add(s2.id); }
      });
    });
  };
  checkConflicts(smwSections);
  checkConflicts(sttSections);

  // Get sections that start within a 30-min slot
  const getAtSlot = (secs: Section[], slotMins: number) =>
    secs.filter(s => s.start_time && toMins(s.start_time) >= slotMins && toMins(s.start_time) < slotMins + 30);

  // Only show slots that have sections (±30 min buffer)
  const usedSlotsMW = new Set(smwSections.map(s => Math.floor(toMins(s.start_time!) / 30) * 30));
  const usedSlotsSTT = new Set(sttSections.map(s => Math.floor(toMins(s.start_time!) / 30) * 30));

  const SectionCard = ({ sec }: { sec: Section }) => {
    const teacher = teachers.find(t => t.id === sec.teacher_id);
    const enrolled = sectionStudents.filter(ss => ss.section_id === sec.id).length;
    const colors = LEVEL_COLORS[sec.level] || LEVEL_COLORS.intro;
    const hasConflict = conflicts.has(sec.id);
    const isFull = enrolled >= sec.max_students;
    return (
      <div className={`relative rounded-xl border-2 p-3 text-right w-full ${hasConflict ? "border-red-400 bg-red-50" : `${colors.border} ${colors.bg}`}`}>
        {hasConflict && <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] rounded-full w-5 h-5 flex items-center justify-center font-bold z-10">!</span>}
        <div className="flex items-center justify-between mb-1">
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${colors.bg} ${colors.text} ${colors.border}`}>{LEVELS[sec.level]} {sec.sub_level}</span>
          <span className={`text-[10px] font-bold ${isFull ? "text-red-600" : "text-green-700"}`}>{enrolled}/{sec.max_students}</span>
        </div>
        <p className={`text-xs font-bold truncate ${hasConflict ? "text-red-700" : colors.text}`}>{sec.name}</p>
        <p className="text-[10px] font-bold text-[var(--primary)] mt-0.5">{formatTime(sec.start_time!)} — {formatTime(sec.end_time || "")}</p>
        {teacher && <p className="text-[10px] text-[var(--text-gray)]">👨‍🏫 {teacher.firstName}</p>}
        {sec.zoom_link && <a href={sec.zoom_link} target="_blank" rel="noreferrer" className="text-[10px] text-blue-500 hover:underline">🔗 Zoom</a>}
      </div>
    );
  };

  const TimetableGrid = ({ group, secs, usedSlots, color }: { group: string; secs: Section[]; usedSlots: Set<number>; color: string }) => {
    const days = group === "SMW"
      ? ["السبت", "الاثنين", "الأربعاء"]
      : ["الأحد", "الثلاثاء", "الخميس"];
    const headerBg = group === "SMW" ? "bg-blue-600" : "bg-purple-600";
    const rowBg = group === "SMW" ? "bg-blue-50/40" : "bg-purple-50/40";
    const timeBold = group === "SMW" ? "text-blue-700" : "text-purple-700";
    const thColor = group === "SMW" ? "text-blue-700" : "text-purple-700";

    const visibleSlots = slots.filter(s => usedSlots.has(s.minutes));

    return (
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
        <div className={`p-4 ${headerBg} text-white flex justify-between items-center`}>
          <div>
            <h2 className="font-bold text-lg">
              {group === "SMW" ? "📘 SMW — السبت / الاثنين / الأربعاء" : "📗 STT — الأحد / الثلاثاء / الخميس"}
            </h2>
            <p className={`text-sm ${group === "SMW" ? "text-blue-100" : "text-purple-100"}`}>كل جلسة 90 دقيقة • {secs.length} شعبة</p>
          </div>
          <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-bold">{secs.length} شعبة</span>
        </div>
        {secs.length === 0 ? (
          <div className="p-8 text-center text-[var(--text-gray)]">لا توجد شعب</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[500px]">
              <thead>
                <tr className={group === "SMW" ? "bg-blue-50" : "bg-purple-50"}>
                  <th className="p-3 text-right text-xs font-bold text-[var(--text-gray)] w-28 border-l border-gray-100">الوقت</th>
                  {days.map(d => <th key={d} className={`p-3 text-center text-xs font-bold ${thColor}`}>{d}</th>)}
                </tr>
              </thead>
              <tbody>
                {visibleSlots.map(slot => {
                  const slotSecs = getAtSlot(secs, slot.minutes);
                  return (
                    <tr key={slot.minutes} className={`border-t border-gray-100 ${rowBg}`}>
                      <td className={`p-3 text-xs font-bold ${timeBold} border-l border-gray-100 w-28 align-top`}>
                        {slot.label}
                      </td>
                      <td colSpan={3} className="p-2">
                        <div className="flex flex-wrap gap-2 justify-start">
                          {slotSecs.map(sec => (
                            <div key={sec.id} className="min-w-[180px] max-w-[220px] flex-1">
                              <SectionCard sec={sec} />
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[var(--soft-white)] pt-16">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[var(--primary)]">📅 جدول الشعب الأسبوعي</h1>
            <p className="text-sm text-[var(--text-gray)] mt-1">
              {sections.length} شعبة نشطة •{" "}
              {conflicts.size > 0
                ? <span className="text-red-500 font-bold">⚠️ {conflicts.size} شعبة بها تضارب</span>
                : <span className="text-green-600 font-bold">✅ لا يوجد تضارب</span>}
            </p>
          </div>
          <button onClick={() => router.push("/ela-control-panel/students")} className="px-4 py-2 border border-gray-200 rounded-xl text-sm hover:bg-gray-50 bg-white">← لوحة الإدارة</button>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-2">
          {Object.entries(LEVELS).map(([key, label]) => (
            <span key={key} className={`px-3 py-1 rounded-full border text-xs font-bold ${LEVEL_COLORS[key].bg} ${LEVEL_COLORS[key].text} ${LEVEL_COLORS[key].border}`}>{label}</span>
          ))}
          {conflicts.size > 0 && <span className="px-3 py-1 rounded-full border text-xs font-bold bg-red-100 text-red-700 border-red-300">⚠️ تضارب</span>}
        </div>

        {/* SMW Table */}
        <TimetableGrid group="SMW" secs={smwSections} usedSlots={usedSlotsMW} color="blue" />

        {/* STT Table */}
        <TimetableGrid group="STT" secs={sttSections} usedSlots={usedSlotsSTT} color="purple" />

        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "إجمالي الشعب", value: sections.length, color: "text-[var(--primary)]", bg: "bg-blue-50" },
            { label: "SMW", value: smwSections.length, color: "text-blue-600", bg: "bg-blue-50" },
            { label: "STT", value: sttSections.length, color: "text-purple-600", bg: "bg-purple-50" },
            { label: "تضارب", value: conflicts.size, color: conflicts.size > 0 ? "text-red-600" : "text-green-600", bg: conflicts.size > 0 ? "bg-red-50" : "bg-green-50" },
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