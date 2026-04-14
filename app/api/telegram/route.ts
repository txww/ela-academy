
import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

const BOT_TOKEN = process.env.TG_BOT_TOKEN;
const ADMIN_CHAT_IDS = (process.env.TG_CHAT_IDS || process.env.TG_CHAT_ID || "").split(",").map(s => s.trim());

const pool = new Pool({
  host: process.env.DB_HOST || "127.0.0.1",
  port: parseInt(process.env.DB_PORT || "5432"),
  database: process.env.DB_NAME || "eladb",
  user: process.env.DB_USER || "elauser",
  password: process.env.DB_PASSWORD,
});

async function sendMessage(chatId: string | number, text: string) {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
  });
}

async function sendToAll(text: string) {
  for (const id of ADMIN_CHAT_IDS) {
    if (id) await sendMessage(id, text);
  }
}

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || "http://localhost:1339";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const message = body?.message;
    if (!message) return NextResponse.json({ ok: true });

    const chatId = message.chat.id;
    const text = (message.text || "").trim();
    const fromId = String(message.from?.id);

    if (!ADMIN_CHAT_IDS.includes(fromId)) {
      await sendMessage(chatId, "⛔ غير مصرح لك باستخدام هذا البوت.");
      return NextResponse.json({ ok: true });
    }

    // ===== /help =====
    if (text === "/start" || text === "/help") {
      await sendMessage(chatId,
        `🎓 <b>E.L.A Academy Bot</b>\n\n` +
        `📋 /students — كل الطلاب\n` +
        `⏳ /pending — بانتظار القبول\n` +
        `📚 /sections — كل الشعب\n` +
        `📅 /today — جدول اليوم كاملاً\n` +
        `💰 /unpaid — لم يدفعوا بعد التجربة\n` +
        `📊 /stats — إحصائيات عامة\n` +
        `💳 /payments — آخر الدفعات\n` +
        `🔍 /find [اسم] — بحث عن طالب\n` +
        `📖 /section [اسم] — تفاصيل شعبة\n` +
        `✅ /approve [إيميل] — قبول طالب\n` +
        `❌ /reject [إيميل] — رفض طالب\n` +
        `📝 /attendance [اسم شعبة] — حضور اليوم`
      );
    }

    // ===== /stats =====
    else if (text === "/stats") {
      const s = await pool.query(`
        SELECT 
          COUNT(*) FILTER (WHERE NOT COALESCE(is_teacher,false) AND email != 'admin@ela.com' AND NOT COALESCE(is_archived,false)) as total,
          COUNT(*) FILTER (WHERE NOT COALESCE(is_teacher,false) AND email != 'admin@ela.com' AND NOT COALESCE(is_archived,false) AND registration_status = 'approved') as approved,
          COUNT(*) FILTER (WHERE NOT COALESCE(is_teacher,false) AND email != 'admin@ela.com' AND NOT COALESCE(is_archived,false) AND registration_status = 'pending') as pending,
          COUNT(*) FILTER (WHERE COALESCE(is_teacher,false)) as teachers
        FROM up_users WHERE email != 'admin@ela.com'
      `);
      const sec = await pool.query(`SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE is_active) as active FROM sections`);
      const pay = await pool.query(`SELECT COALESCE(SUM(amount),0) as total, COUNT(*) as count FROM payments WHERE status='paid'`);
      const unpaid = await pool.query(`SELECT COUNT(*) as total FROM section_students WHERE payment_status = 'trial' AND trial_sessions_used >= 3`);
      const wl = await pool.query(`SELECT COUNT(*) as total FROM waitlist`);
      const r = s.rows[0];
      await sendMessage(chatId,
        `📊 <b>إحصائيات E.L.A Academy</b>\n\n` +
        `👥 الطلاب النشطين: ${r.total}\n` +
        `✅ مقبولون: ${r.approved}\n` +
        `⏳ بانتظار: ${r.pending}\n` +
        `👨‍🏫 مدرسون: ${r.teachers}\n` +
        `⏳ قائمة انتظار: ${wl.rows[0].total}\n\n` +
        `📚 الشعب: ${sec.rows[0].total} (${sec.rows[0].active} نشطة)\n` +
        `💰 إجمالي الإيرادات: $${parseFloat(pay.rows[0].total).toFixed(2)}\n` +
        `⚠️ لم يدفعوا: ${unpaid.rows[0].total} طالب`
      );
    }

    // ===== /unpaid =====
    else if (text === "/unpaid") {
      const res = await pool.query(`
        SELECT ss.trial_sessions_used, ss.first_session_date,
               u.first_name, u.last_name, u.phone, u.telegram,
               s.name as section_name
        FROM section_students ss
        JOIN up_users u ON u.id = ss.student_id
        JOIN sections s ON s.id = ss.section_id
        WHERE ss.payment_status = 'trial' AND ss.trial_sessions_used >= 3
        ORDER BY ss.first_session_date ASC
      `);
      if (res.rows.length === 0) {
        await sendMessage(chatId, "✅ جميع الطلاب دفعوا!");
      } else {
        let msg = `⚠️ <b>طلاب انتهت تجربتهم ولم يدفعوا (${res.rows.length})</b>\n\n`;
        res.rows.forEach((s, i) => {
          msg += `${i+1}. <b>${s.first_name||""} ${s.last_name||""}</b>\n`;
          msg += `   📚 ${s.section_name}\n`;
          msg += `   📱 ${s.phone || "—"}\n`;
          if (s.telegram) msg += `   💬 @${s.telegram}\n`;
          msg += `   🎁 استخدم ${s.trial_sessions_used}/3 جلسات\n`;
          if (s.first_session_date) msg += `   📅 بدأ: ${new Date(s.first_session_date).toLocaleDateString("ar")}\n`;
          msg += `\n`;
        });
        await sendMessage(chatId, msg);
      }
    }

    // ===== /pending =====
    else if (text === "/pending") {
      const res = await pool.query(`
        SELECT first_name, last_name, email, phone, telegram, residence_country, created_at
        FROM up_users 
        WHERE registration_status = 'pending' AND NOT COALESCE(is_teacher,false) AND email != 'admin@ela.com' AND NOT COALESCE(is_archived,false)
        ORDER BY created_at DESC LIMIT 20
      `);
      if (res.rows.length === 0) {
        await sendMessage(chatId, "✅ لا يوجد طلاب بانتظار القبول");
      } else {
        let msg = `⏳ <b>بانتظار القبول (${res.rows.length})</b>\n\n`;
        res.rows.forEach((s, i) => {
          msg += `${i+1}. <b>${s.first_name||""} ${s.last_name||""}</b>\n`;
          msg += `   📧 ${s.email}\n`;
          if (s.phone) msg += `   📱 ${s.phone}\n`;
          if (s.telegram) msg += `   💬 @${s.telegram}\n`;
          if (s.residence_country) msg += `   🌍 ${s.residence_country}\n`;
          msg += `\n`;
        });
        msg += `\nللقبول: /approve [إيميل]`;
        await sendMessage(chatId, msg);
      }
    }

    // ===== /approve =====
    else if (text.startsWith("/approve ")) {
      const email = text.replace("/approve ", "").trim();
      const user = await pool.query(`SELECT id, first_name, last_name FROM up_users WHERE email = $1`, [email]);
      if (user.rows.length === 0) {
        await sendMessage(chatId, `❌ لم يتم العثور على طالب بالإيميل: ${email}`);
      } else {
        const u = user.rows[0];
        // Update via Strapi
        const jwt = process.env.STRAPI_JWT || "";
        await fetch(`${STRAPI_URL}/api/users/${u.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` },
          body: JSON.stringify({ registrationStatus: "approved" }),
        });
        await sendMessage(chatId, `✅ تم قبول الطالب: <b>${u.first_name} ${u.last_name}</b>`);
      }
    }

    // ===== /reject =====
    else if (text.startsWith("/reject ")) {
      const email = text.replace("/reject ", "").trim();
      const user = await pool.query(`SELECT id, first_name, last_name FROM up_users WHERE email = $1`, [email]);
      if (user.rows.length === 0) {
        await sendMessage(chatId, `❌ لم يتم العثور على طالب بالإيميل: ${email}`);
      } else {
        const u = user.rows[0];
        const jwt = process.env.STRAPI_JWT || "";
        await fetch(`${STRAPI_URL}/api/users/${u.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` },
          body: JSON.stringify({ registrationStatus: "rejected" }),
        });
        await sendMessage(chatId, `❌ تم رفض الطالب: <b>${u.first_name} ${u.last_name}</b>`);
      }
    }

    // ===== /students =====
    else if (text === "/students") {
      const res = await pool.query(`
        SELECT first_name, last_name, phone, telegram, registration_status
        FROM up_users 
        WHERE NOT COALESCE(is_teacher,false) AND email != 'admin@ela.com' AND NOT COALESCE(is_archived,false)
        ORDER BY created_at DESC LIMIT 30
      `);
      let msg = `🎓 <b>الطلاب (${res.rows.length})</b>\n\n`;
      res.rows.forEach((s, i) => {
        const st = s.registration_status==="approved"?"✅":s.registration_status==="pending"?"⏳":"❌";
        msg += `${i+1}. ${st} <b>${s.first_name||""} ${s.last_name||""}</b> — 📱${s.phone||"—"}\n`;
      });
      await sendMessage(chatId, msg);
    }

    // ===== /sections =====
    else if (text === "/sections") {
      const res = await pool.query(`
        SELECT s.name, s.level, s.sub_level, s.start_time, s.end_time, s.day_group, s.zoom_link, s.max_students,
               u.first_name as tf, u.last_name as tl,
               COUNT(ss.id) as sc
        FROM sections s
        LEFT JOIN up_users u ON u.id=s.teacher_id
        LEFT JOIN section_students ss ON ss.section_id=s.id
        WHERE s.is_active=true
        GROUP BY s.id, u.first_name, u.last_name
        ORDER BY s.day_group, s.start_time
      `);
      let msg = `📚 <b>الشعب النشطة (${res.rows.length})</b>\n\n`;
      res.rows.forEach(s => {
        msg += `📖 <b>${s.name}</b>\n`;
        msg += `   🕐 ${s.start_time||"—"} — ${s.end_time||"—"} (${s.day_group||"—"})\n`;
        msg += `   👨‍🏫 ${s.tf||"—"} ${s.tl||""}\n`;
        msg += `   👥 ${s.sc}/${s.max_students}\n`;
        if (s.zoom_link) msg += `   🔗 ${s.zoom_link}\n`;
        msg += `\n`;
      });
      await sendMessage(chatId, msg);
    }

    // ===== /today =====
    else if (text === "/today") {
      const now = new Date();
      const day = now.getDay();
      const days = ["الأحد","الاثنين","الثلاثاء","الأربعاء","الخميس","الجمعة","السبت"];
      const group = [0,2,4].includes(day)?"STT":[6,1,3].includes(day)?"SMW":null;
      if (!group) {
        await sendMessage(chatId, `📅 اليوم ${days[day]} — لا توجد جلسات 😴`);
        return NextResponse.json({ ok: true });
      }
      const res = await pool.query(`
        SELECT s.*, u.first_name as tf, u.last_name as tl
        FROM sections s
        LEFT JOIN up_users u ON u.id=s.teacher_id
        WHERE s.is_active=true AND s.day_group=$1
        ORDER BY s.start_time`, [group]);

      let msg = `📅 <b>${days[day]} — ${group}</b>\n`;
      msg += `━━━━━━━━━━━━━━━━\n\n`;

      for (const sec of res.rows) {
        const stu = await pool.query(`
          SELECT u.first_name, u.last_name, u.phone, u.telegram,
                 ss.payment_status, ss.trial_sessions_used
          FROM section_students ss
          JOIN up_users u ON u.id=ss.student_id
          WHERE ss.section_id=$1 ORDER BY u.first_name`, [sec.id]);

        msg += `🕐 <b>${sec.start_time} — ${sec.end_time}</b>\n`;
        msg += `📚 ${sec.name} | 👨‍🏫 ${sec.tf||"—"}\n`;
        if (sec.zoom_link) msg += `🔗 ${sec.zoom_link}\n`;
        msg += `👥 الطلاب (${stu.rows.length}/${sec.max_students}):\n`;

        stu.rows.forEach((st, i) => {
          const payIcon = st.payment_status === "paid" ? "✅" : st.trial_sessions_used >= 3 ? "⚠️" : "🎁";
          msg += `  ${i+1}. ${payIcon} ${st.first_name||""} ${st.last_name||""}`;
          if (st.phone) msg += ` — 📱${st.phone}`;
          if (st.telegram) msg += ` @${st.telegram}`;
          msg += `\n`;
        });
        msg += `\n`;
      }
      await sendMessage(chatId, msg);
    }

    // ===== /attendance [section] =====
    else if (text.startsWith("/attendance")) {
      const query = text.replace("/attendance", "").trim();
      const now = new Date();
      const day = now.getDay();
      const group = [0,2,4].includes(day)?"STT":[6,1,3].includes(day)?"SMW":null;

      // UTC+3 today date
      const today = new Date(now.getTime() + 3*60*60*1000).toISOString().split("T")[0];

      const secQuery = query
        ? `SELECT * FROM sections WHERE name ILIKE $1 AND is_active=true LIMIT 1`
        : `SELECT * FROM sections WHERE day_group=$1 AND is_active=true ORDER BY start_time`;
      const secParams = query ? [`%${query}%`] : [group || "SMW"];
      const secs = await pool.query(secQuery, secParams);

      if (secs.rows.length === 0) {
        await sendMessage(chatId, `❌ لم يتم العثور على شعبة`);
        return NextResponse.json({ ok: true });
      }

      let msg = `✅ <b>حضور ${today}</b>\n\n`;
      for (const sec of secs.rows) {
        const att = await pool.query(
          `SELECT a.status, u.first_name, u.last_name FROM attendance a JOIN up_users u ON u.id=a.student_id WHERE a.section_id=$1 AND a.session_date=$2`,
          [sec.id, today]
        );
        msg += `📚 <b>${sec.name}</b>\n`;
        if (att.rows.length === 0) {
          msg += `   لم يُسجل الحضور بعد\n`;
        } else {
          att.rows.forEach(a => {
            const icon = a.status==="present"?"✅":a.status==="absent"?"❌":a.status==="late"?"⏰":"🔖";
            msg += `   ${icon} ${a.first_name||""} ${a.last_name||""}\n`;
          });
        }
        msg += `\n`;
      }
      await sendMessage(chatId, msg);
    }

    // ===== /find =====
    else if (text.startsWith("/find ")) {
      const q = text.replace("/find ","").trim();
      const res = await pool.query(`
        SELECT u.first_name, u.last_name, u.email, u.phone, u.telegram,
               u.registration_status, u.residence_country,
               string_agg(s.name,', ') as secs,
               (SELECT COUNT(*) FROM attendance a WHERE a.student_id=u.id AND a.status='present') as present_count,
               (SELECT COALESCE(SUM(p.amount),0) FROM payments p WHERE p.student_id=u.id AND p.status='paid') as total_paid
        FROM up_users u
        LEFT JOIN section_students ss ON ss.student_id=u.id
        LEFT JOIN sections s ON s.id=ss.section_id
        WHERE (u.first_name ILIKE $1 OR u.last_name ILIKE $1 OR u.phone ILIKE $1)
          AND NOT COALESCE(u.is_teacher,false) AND u.email!='admin@ela.com'
        GROUP BY u.id LIMIT 5`, [`%${q}%`]);

      if (res.rows.length === 0) {
        await sendMessage(chatId, `❌ لم يتم العثور على "${q}"`);
      } else {
        let msg = `🔍 <b>نتائج "${q}"</b>\n\n`;
        res.rows.forEach(s => {
          const st = s.registration_status==="approved"?"✅":s.registration_status==="pending"?"⏳":"❌";
          msg += `${st} <b>${s.first_name||""} ${s.last_name||""}</b>\n`;
          msg += `📧 ${s.email}\n`;
          if (s.phone) msg += `📱 ${s.phone}\n`;
          if (s.telegram) msg += `💬 @${s.telegram}\n`;
          if (s.residence_country) msg += `🌍 ${s.residence_country}\n`;
          if (s.secs) msg += `📚 ${s.secs}\n`;
          msg += `✅ حضر: ${s.present_count} جلسة | 💰 دفع: $${parseFloat(s.total_paid).toFixed(2)}\n\n`;
        });
        await sendMessage(chatId, msg);
      }
    }

    // ===== /section =====
    else if (text.startsWith("/section ")) {
      const q = text.replace("/section ","").trim();
      const res = await pool.query(`SELECT s.*, u.first_name as tf, u.last_name as tl FROM sections s LEFT JOIN up_users u ON u.id=s.teacher_id WHERE s.name ILIKE $1 LIMIT 1`, [`%${q}%`]);
      if (res.rows.length === 0) {
        await sendMessage(chatId, `❌ شعبة "${q}" غير موجودة`);
      } else {
        const sec = res.rows[0];
        const stu = await pool.query(`
          SELECT u.first_name, u.last_name, u.phone, u.telegram, u.email,
                 ss.payment_status, ss.trial_sessions_used,
                 (SELECT COUNT(*) FROM attendance a WHERE a.student_id=u.id AND a.section_id=$1 AND a.status='present') as present_count
          FROM section_students ss
          JOIN up_users u ON u.id=ss.student_id
          WHERE ss.section_id=$1 ORDER BY u.first_name`, [sec.id]);

        let msg = `📚 <b>${sec.name}</b>\n`;
        msg += `🕐 ${sec.start_time||"—"} — ${sec.end_time||"—"} (${sec.day_group||"—"})\n`;
        msg += `👨‍🏫 ${sec.tf||"—"} ${sec.tl||""}\n`;
        msg += `👥 ${stu.rows.length}/${sec.max_students}\n`;
        if (sec.zoom_link) msg += `🔗 ${sec.zoom_link}\n`;
        msg += `\n<b>الطلاب:</b>\n`;
        stu.rows.forEach((st, i) => {
          const payIcon = st.payment_status==="paid"?"✅":st.trial_sessions_used>=3?"⚠️":"🎁";
          msg += `${i+1}. ${payIcon} <b>${st.first_name||""} ${st.last_name||""}</b>\n`;
          msg += `   📱 ${st.phone||"—"} | حضر: ${st.present_count} جلسة\n`;
          if (st.telegram) msg += `   💬 @${st.telegram}\n`;
        });
        await sendMessage(chatId, msg);
      }
    }

    // ===== /payments =====
    else if (text === "/payments") {
      const res = await pool.query(`
        SELECT p.*, u.first_name, u.last_name
        FROM payments p LEFT JOIN up_users u ON u.id=p.student_id
        ORDER BY p.payment_date DESC LIMIT 10
      `);
      let msg = `💰 <b>آخر الدفعات</b>\n\n`;
      res.rows.forEach((p, i) => {
        msg += `${i+1}. <b>${p.first_name||""} ${p.last_name||""}</b>\n`;
        msg += `   💵 ${p.amount} ${p.currency} — ${p.status==="paid"?"✅":"⏳"}\n`;
        msg += `   📅 ${new Date(p.payment_date).toLocaleDateString("ar")}\n\n`;
      });
      await sendMessage(chatId, msg);
    }

    else {
      await sendMessage(chatId, `❓ أمر غير معروف.\nأرسل /help لرؤية الأوامر المتاحة.`);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Telegram webhook error:", error);
    return NextResponse.json({ ok: true });
  }
}
