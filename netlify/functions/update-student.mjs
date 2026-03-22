import { neon } from '@neondatabase/serverless';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: CORS, body: JSON.stringify({ success: false, message: 'Method not allowed' }) };

  let student_id, faculty, department, year;
  try {
    ({ student_id, faculty, department, year } = JSON.parse(event.body || '{}'));
  } catch {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ success: false, message: 'Invalid request body' }) };
  }

  if (!student_id || !faculty || !department || !year)
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ success: false, message: 'All fields required' }) };

  try {
    const sql      = neon(process.env.DATABASE_URL);
    const existing = await sql`SELECT id FROM students WHERE student_id = ${student_id}`;
    if (!existing.length) return { statusCode: 404, headers: CORS, body: JSON.stringify({ success: false, message: 'Student not found' }) };

    await sql`
      UPDATE students
      SET faculty = ${faculty}, department = ${department}, year = ${year}
      WHERE student_id = ${student_id}
    `;

    return { statusCode: 200, headers: CORS, body: JSON.stringify({ success: true, message: 'Student updated successfully' }) };
  } catch (e) {
    console.error('[update-student]', e.message);
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ success: false, message: 'Server error: ' + e.message }) };
  }
};
