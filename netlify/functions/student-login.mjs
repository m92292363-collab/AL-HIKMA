import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

function gradeFromMarks(marks) {
  if (marks >= 90) return 'A+';
  if (marks >= 85) return 'A';
  if (marks >= 80) return 'A-';
  if (marks >= 75) return 'B+';
  if (marks >= 70) return 'B';
  if (marks >= 65) return 'B-';
  if (marks >= 60) return 'C+';
  if (marks >= 55) return 'C';
  if (marks >= 50) return 'C-';
  if (marks >= 45) return 'D';
  return 'F';
}

function gradePoint(g) {
  const map = {
    'A+': 4.0, 'A': 4.0, 'A-': 3.7,
    'B+': 3.3, 'B': 3.0, 'B-': 2.7,
    'C+': 2.3, 'C': 2.0, 'C-': 1.7,
    'D':  1.0, 'F': 0.0,
  };
  return map[g] ?? 0;
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: CORS, body: JSON.stringify({ success: false, message: 'Method not allowed' }) };

  let email, password;
  try {
    const body = JSON.parse(event.body || '{}');
    email    = body.email;
    password = body.password;
  } catch {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ success: false, message: 'Invalid request body' }) };
  }

  if (!email || !password) return { statusCode: 400, headers: CORS, body: JSON.stringify({ success: false, message: 'Email and password are required' }) };
  if (!process.env.DATABASE_URL) return { statusCode: 500, headers: CORS, body: JSON.stringify({ success: false, message: 'Database not configured' }) };

  try {
    const sql = neon(process.env.DATABASE_URL);

    const rows = await sql`
      SELECT student_id, email, full_name, faculty, department, year, password_hash
      FROM students
      WHERE LOWER(email) = LOWER(${email.trim()})
      LIMIT 1
    `;

    if (!rows.length) return { statusCode: 401, headers: CORS, body: JSON.stringify({ success: false, message: 'No account found with that email address' }) };

    const student = rows[0];
    const valid = await bcrypt.compare(password, student.password_hash);
    if (!valid) return { statusCode: 401, headers: CORS, body: JSON.stringify({ success: false, message: 'Incorrect password. Please try again.' }) };

    const results = await sql`
      SELECT id, subject_name, year, semester, marks, grade, credit_hours
      FROM results
      WHERE student_id = ${student.student_id}
      ORDER BY year ASC, semester ASC, subject_name ASC
    `;

    const enriched = results.map(r => ({
      id:           r.id,
      subject_name: r.subject_name,
      year:         Number(r.year),
      semester:     Number(r.semester),
      marks:        Number(r.marks),
      grade:        r.grade || gradeFromMarks(Number(r.marks)),
      credit_hours: Number(r.credit_hours),
      pass:         Number(r.marks) >= 50,
    }));

    let totalPts = 0, totalHrs = 0;
    enriched.forEach(r => { totalPts += gradePoint(r.grade) * r.credit_hours; totalHrs += r.credit_hours; });
    const cgpa = totalHrs ? (totalPts / totalHrs).toFixed(2) : null;

    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify({
        success: true,
        student: {
          student_id: student.student_id,
          email:      student.email,
          full_name:  student.full_name,
          faculty:    student.faculty,
          department: student.department,
          year:       student.year,
          cgpa,
        },
        results: enriched,
      }),
    };
  } catch (e) {
    console.error('[student-login]', e.message);
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ success: false, message: 'A server error occurred. Please try again.' }) };
  }
};
