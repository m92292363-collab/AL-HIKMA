import { neon } from '@neondatabase/serverless';
import jwt from 'jsonwebtoken';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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

function verifyAdmin(event) {
  const auth = event.headers['authorization'] || event.headers['Authorization'] || '';
  const token = auth.replace('Bearer ', '');
  if (!token) throw new Error('Unauthorized');
  return jwt.verify(token, process.env.JWT_SECRET);
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: CORS, body: JSON.stringify({ success: false, message: 'Method not allowed' }) };

  try { verifyAdmin(event); } catch { return { statusCode: 401, headers: CORS, body: JSON.stringify({ success: false, message: 'Unauthorized' }) }; }

  let student_id, subject_name, year, semester, marks, credit_hours;
  try {
    ({ student_id, subject_name, year, semester, marks, credit_hours } = JSON.parse(event.body || '{}'));
  } catch {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ success: false, message: 'Invalid request body' }) };
  }

  if (!student_id || !subject_name || !year || !semester || marks === undefined || !credit_hours)
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ success: false, message: 'All fields required' }) };

  if (marks < 0 || marks > 100)
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ success: false, message: 'Marks must be 0–100' }) };

  try {
    const sql = neon(process.env.DATABASE_URL);
    const student = await sql`SELECT id FROM students WHERE student_id = ${student_id}`;
    if (!student.length) return { statusCode: 404, headers: CORS, body: JSON.stringify({ success: false, message: 'Student not found' }) };

    const grade = gradeFromMarks(marks);
    await sql`
      INSERT INTO results (student_id, subject_name, year, semester, marks, grade, credit_hours)
      VALUES (${student_id}, ${subject_name}, ${year}, ${semester}, ${marks}, ${grade}, ${credit_hours})
      ON CONFLICT (student_id, subject_name, year, semester)
      DO UPDATE SET marks = ${marks}, grade = ${grade}, credit_hours = ${credit_hours}
    `;

    return { statusCode: 200, headers: CORS, body: JSON.stringify({ success: true, message: 'Result saved', grade }) };
  } catch (e) {
    console.error('[add-marks]', e.message);
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ success: false, message: 'Server error' }) };
  }
};
