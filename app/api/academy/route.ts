import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  host: process.env.DB_HOST || "127.0.0.1",
  port: parseInt(process.env.DB_PORT || "5432"),
  database: process.env.DB_NAME || "eladb",
  user: process.env.DB_USER || "elauser",
  password: process.env.DB_PASSWORD || "ela2026secure",
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const table = searchParams.get("table");
  const sectionId = searchParams.get("section_id");
  const studentId = searchParams.get("student_id");
  const teacherId = searchParams.get("teacher_id");

  try {
    let query = "";
    let params: (string | number)[] = [];

    switch (table) {
      case "sections":
        query = teacherId
          ? "SELECT * FROM sections WHERE teacher_id = $1 ORDER BY created_at DESC"
          : "SELECT * FROM sections ORDER BY created_at DESC";
        params = teacherId ? [parseInt(teacherId)] : [];
        break;
      case "section_students":
        query = "SELECT * FROM section_students WHERE section_id = $1 ORDER BY enrolled_at DESC";
        params = [parseInt(sectionId || "0")];
        break;
      case "assignments":
        query = sectionId
          ? "SELECT * FROM assignments WHERE section_id = $1 ORDER BY due_date DESC"
          : teacherId
          ? "SELECT * FROM assignments WHERE teacher_id = $1 ORDER BY due_date DESC"
          : "SELECT * FROM assignments ORDER BY due_date DESC";
        params = sectionId ? [parseInt(sectionId)] : teacherId ? [parseInt(teacherId)] : [];
        break;
      case "submissions":
        query = "SELECT * FROM assignment_submissions WHERE assignment_id = $1 ORDER BY submitted_at DESC";
        params = [parseInt(searchParams.get("assignment_id") || "0")];
        break;
      case "attendance":
        query = sectionId
          ? "SELECT * FROM attendance WHERE section_id = $1 ORDER BY session_date DESC"
          : studentId
          ? "SELECT * FROM attendance WHERE student_id = $1 ORDER BY session_date DESC"
          : "SELECT * FROM attendance ORDER BY session_date DESC LIMIT 500";
        params = sectionId ? [parseInt(sectionId)] : studentId ? [parseInt(studentId)] : [];
        break;
      case "evaluations":
        query = studentId
          ? "SELECT * FROM evaluations WHERE student_id = $1 ORDER BY created_at DESC"
          : sectionId
          ? "SELECT * FROM evaluations WHERE section_id = $1 ORDER BY created_at DESC"
          : "SELECT * FROM evaluations ORDER BY created_at DESC LIMIT 500";
        params = studentId ? [parseInt(studentId)] : sectionId ? [parseInt(sectionId)] : [];
        break;
      case "materials":
        query = "SELECT * FROM course_materials WHERE is_active = true ORDER BY level, type";
        break;
      default:
        return NextResponse.json({ error: "Invalid table" }, { status: 400 });
    }

    const result = await pool.query(query, params);
    return NextResponse.json(result.rows);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { table, ...data } = body;

  try {
    let query = "";
    let params: (string | number | boolean | null)[] = [];

    switch (table) {
      case "sections":
        query = "INSERT INTO sections (name, level, sub_level, teacher_id, max_students, zoom_link, schedule) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *";
        params = [data.name, data.level, data.sub_level || "A", data.teacher_id || null, data.max_students || 7, data.zoom_link || null, data.schedule || null];
        break;
      case "section_students":
        query = "INSERT INTO section_students (section_id, student_id) VALUES ($1,$2) ON CONFLICT DO NOTHING RETURNING *";
        params = [data.section_id, data.student_id];
        break;
      case "assignments":
        query = "INSERT INTO assignments (section_id, teacher_id, title, description, due_date) VALUES ($1,$2,$3,$4,$5) RETURNING *";
        params = [data.section_id, data.teacher_id, data.title, data.description || null, data.due_date || null];
        break;
      case "submissions":
        query = "INSERT INTO assignment_submissions (assignment_id, student_id, grade, notes) VALUES ($1,$2,$3,$4) ON CONFLICT (assignment_id, student_id) DO UPDATE SET grade=$3, notes=$4 RETURNING *";
        params = [data.assignment_id, data.student_id, data.grade || null, data.notes || null];
        break;
      case "attendance":
        query = "INSERT INTO attendance (section_id, student_id, session_date, status, marked_by) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (section_id, student_id, session_date) DO UPDATE SET status=$4 RETURNING *";
        params = [data.section_id, data.student_id, data.session_date, data.status || "absent", data.marked_by || null];
        break;
      case "evaluations":
        query = "INSERT INTO evaluations (student_id, teacher_id, section_id, type, score, max_score, notes) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *";
        params = [data.student_id, data.teacher_id, data.section_id || null, data.type || "monthly", data.score, data.max_score || 100, data.notes || null];
        break;
      case "materials":
        query = "INSERT INTO course_materials (level, title, type, file_url) VALUES ($1,$2,$3,$4) RETURNING *";
        params = [data.level, data.title, data.type || "student_book", data.file_url || null];
        break;
      default:
        return NextResponse.json({ error: "Invalid table" }, { status: 400 });
    }

    const result = await pool.query(query, params);
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const { table, id, ...data } = body;

  try {
    const sets = Object.keys(data).map((k, i) => `${k} = $${i + 2}`).join(", ");
    const values = Object.values(data);
    const query = `UPDATE ${table} SET ${sets} WHERE id = $1 RETURNING *`;
    const result = await pool.query(query, [id, ...values]);
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const table = searchParams.get("table");
  const id = searchParams.get("id");

  try {
    const result = await pool.query(`DELETE FROM ${table} WHERE id = $1 RETURNING *`, [parseInt(id || "0")]);
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}