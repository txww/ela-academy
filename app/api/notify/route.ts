import { NextRequest, NextResponse } from "next/server";

const TG_BOT_TOKEN = process.env.TG_BOT_TOKEN;
const TG_CHAT_ID = process.env.TG_CHAT_ID;

async function sendTelegram(text: string) {
  if (!TG_BOT_TOKEN || !TG_CHAT_ID) return;
  await fetch(`https://api.telegram.org/bot${TG_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: TG_CHAT_ID, text, parse_mode: "HTML" }),
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, data } = body;
    let message = "";

    switch (type) {
      case "new_student":
        message = `🎓 <b>طالب جديد سجّل!</b>\n\n👤 ${data.firstName} ${data.lastName}\n📧 ${data.email}\n📱 ${data.phone || "—"}\n🌍 ${data.residenceCountry || "—"}\n⏰ ${new Date().toLocaleString("ar-SA")}`;
        break;
      case "student_approved":
        message = `✅ <b>تم قبول طالب</b>\n\n👤 ${data.firstName} ${data.lastName}\n📧 ${data.email}\n⏰ ${new Date().toLocaleString("ar-SA")}`;
        break;
      case "student_rejected":
        message = `❌ <b>تم رفض طالب</b>\n\n👤 ${data.firstName} ${data.lastName}\n📧 ${data.email}\n⏰ ${new Date().toLocaleString("ar-SA")}`;
        break;
      case "student_enrolled":
        message = `📚 <b>طالب انضم لشعبة</b>\n\n👤 ${data.studentName}\n📚 الشعبة: ${data.sectionName}\n🕐 الوقت: ${data.schedule || "—"}\n⏰ ${new Date().toLocaleString("ar-SA")}`;
        break;
      case "payment":
        message = `💰 <b>دفعة مالية جديدة</b>\n\n👤 ${data.studentName}\n💵 المبلغ: ${data.amount} ${data.currency}\n📋 النوع: ${data.type === "subscription" ? "اشتراك" : data.type === "trial" ? "تجربة" : data.type}\n✅ الحالة: ${data.status === "paid" ? "مدفوع" : data.status}\n⏰ ${new Date().toLocaleString("ar-SA")}`;
        break;
      case "session_reminder":
        message = `⏰ <b>تذكير — جلسة خلال 30 دقيقة!</b>\n\n📚 الشعبة: ${data.sectionName}\n🕐 الوقت: ${data.startTime} — ${data.endTime}\n📅 الأيام: ${data.dayGroup === "SMW" ? "السبت/الاثنين/الأربعاء" : "الأحد/الثلاثاء/الخميس"}\n👥 الطلاب: ${data.studentCount}\n${data.zoomLink ? `🔗 Zoom: ${data.zoomLink}` : ""}`;
        break;
      case "daily_schedule":
        message = `📅 <b>جدول اليوم — ${data.dayName}</b>\n\n${data.sessions.length === 0 ? "لا توجد جلسات اليوم 😴" : data.sessions.map((s: { time: string; name: string; students: number; zoom: string }) => `🕐 ${s.time} — ${s.name} (${s.students} طالب)${s.zoom ? "\n🔗 " + s.zoom : ""}`).join("\n\n")}`;
        break;
      case "weekly_summary":
        message = `📊 <b>ملخص الأسبوع</b>\n\n🎓 الطلاب: ${data.totalStudents}\n✅ مقبولون: ${data.approvedStudents}\n⏳ بانتظار: ${data.pendingStudents}\n📚 الشعب النشطة: ${data.activeSections}\n💰 إيرادات الأسبوع: $${data.weekRevenue}`;
        break;
      case "waitlist_added":
        message = `⏳ <b>طالب أُضيف لقائمة الانتظار</b>\n\n👤 ${data.firstName} ${data.lastName}\n📧 ${data.email}\n📅 موعد التسجيل المتوقع: ${data.expectedDate || "غير محدد"}\n⏰ ${new Date().toLocaleString("ar-SA")}`;
        break;
      default:
        message = `📢 إشعار جديد: ${JSON.stringify(data)}`;
    }

    await sendTelegram(message);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// GET endpoint for cron jobs
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get("secret");
  const type = searchParams.get("type");

  if (secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const DB_URL = `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;

  try {
    const { Pool } = await import("pg");
    const pool = new Pool({
      host: process.env.DB_HOST || "127.0.0.1",
      port: parseInt(process.env.DB_PORT || "5432"),
      database: process.env.DB_NAME || "eladb",
      user: process.env.DB_USER || "elauser",
      password: process.env.DB_PASSWORD,
    });

    if (type === "daily") {
      // Send today's schedule
      const now = new Date();
      const dayOfWeek = now.getDay(); // 0=Sun,1=Mon,2=Tue,3=Wed,4=Thu,5=Fri,6=Sat
      const dayNames = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
      const dayName = dayNames[dayOfWeek];

      // Determine group
      const isSTT = [0, 2, 4].includes(dayOfWeek); // Sun, Tue, Thu
      const isSMW = [6, 1, 3].includes(dayOfWeek); // Sat, Mon, Wed
      const group = isSTT ? "STT" : isSMW ? "SMW" : null;

      if (!group) {
        await sendTelegram(`📅 <b>جدول اليوم — ${dayName}</b>\n\nلا توجد جلسات اليوم (${dayName}) 😴`);
        return NextResponse.json({ success: true });
      }

      const sectionsRes = await pool.query(
        `SELECT s.*, COUNT(ss.id) as student_count 
         FROM sections s 
         LEFT JOIN section_students ss ON ss.section_id = s.id 
         WHERE s.is_active = true AND s.day_group = $1 
         GROUP BY s.id 
         ORDER BY s.start_time ASC`,
        [group]
      );

      const sessions = sectionsRes.rows.map(s => ({
        time: `${s.start_time} — ${s.end_time}`,
        name: s.name,
        students: parseInt(s.student_count),
        zoom: s.zoom_link || "",
      }));

      const message = `📅 <b>جدول اليوم — ${dayName} (${group})</b>\n\n${
        sessions.length === 0
          ? "لا توجد شعب نشطة اليوم"
          : sessions.map(s => `🕐 ${s.time}\n📚 ${s.name} — ${s.students} طالب${s.zoom ? "\n🔗 " + s.zoom : ""}`).join("\n\n")
      }`;

      await sendTelegram(message);
      await pool.end();
      return NextResponse.json({ success: true, sessions: sessions.length });
    }

    if (type === "reminder") {
      // Send reminders for sessions starting in 30 minutes
      const now = new Date();
      const dayOfWeek = now.getDay();
      const isSTT = [0, 2, 4].includes(dayOfWeek);
      const isSMW = [6, 1, 3].includes(dayOfWeek);
      const group = isSTT ? "STT" : isSMW ? "SMW" : null;

      if (!group) return NextResponse.json({ success: true, message: "no sessions today" });

      const currentMins = now.getHours() * 60 + now.getMinutes();
      const targetMins = currentMins + 30;
      const targetH = Math.floor(targetMins / 60) % 24;
      const targetM = targetMins % 60;
      const targetTime = `${String(targetH).padStart(2,"0")}:${String(targetM).padStart(2,"0")}`;

      const sectionsRes = await pool.query(
        `SELECT s.*, COUNT(ss.id) as student_count 
         FROM sections s 
         LEFT JOIN section_students ss ON ss.section_id = s.id 
         WHERE s.is_active = true AND s.day_group = $1 
         AND s.start_time BETWEEN $2 AND $3
         GROUP BY s.id`,
        [group, targetTime, `${String(targetH).padStart(2,"0")}:${String(Math.min(targetM + 5, 59)).padStart(2,"0")}`]
      );

      for (const sec of sectionsRes.rows) {
        await sendTelegram(
          `⏰ <b>تذكير — جلسة خلال 30 دقيقة!</b>\n\n📚 ${sec.name}\n🕐 ${sec.start_time} — ${sec.end_time}\n📅 ${group === "SMW" ? "السبت/الاثنين/الأربعاء" : "الأحد/الثلاثاء/الخميس"}\n👥 ${sec.student_count} طالب${sec.zoom_link ? "\n🔗 " + sec.zoom_link : ""}`
        );
      }

      await pool.end();
      return NextResponse.json({ success: true, reminders: sectionsRes.rows.length });
    }

    if (type === "weekly") {
      const statsRes = await pool.query(`
        SELECT 
          COUNT(*) FILTER (WHERE NOT is_teacher AND email != 'admin@ela.com' AND NOT COALESCE(is_archived, false)) as total_students,
          COUNT(*) FILTER (WHERE NOT is_teacher AND email != 'admin@ela.com' AND registration_status = 'approved') as approved,
          COUNT(*) FILTER (WHERE NOT is_teacher AND email != 'admin@ela.com' AND registration_status = 'pending') as pending
        FROM up_users
      `);
      const sectRes = await pool.query(`SELECT COUNT(*) as active FROM sections WHERE is_active = true`);
      const payRes = await pool.query(`SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE status = 'paid' AND payment_date >= NOW() - INTERVAL '7 days'`);

      const stats = statsRes.rows[0];
      const message = `📊 <b>ملخص الأسبوع — E.L.A Academy</b>\n\n🎓 إجمالي الطلاب: ${stats.total_students}\n✅ مقبولون: ${stats.approved}\n⏳ بانتظار: ${stats.pending}\n📚 الشعب النشطة: ${sectRes.rows[0].active}\n💰 إيرادات هذا الأسبوع: $${parseFloat(payRes.rows[0].total).toFixed(2)}`;

      await sendTelegram(message);
      await pool.end();
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unknown type" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
