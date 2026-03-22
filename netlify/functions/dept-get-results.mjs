import { neon } from '@neondatabase/serverless';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };

  const department = event.queryStringParameters?.department || '';
  if (!department) return { statusCode: 400, headers: CORS, body: JSON.stringify({ success: false, message: 'Department required' }) };

  try {
    const sql     = neon(process.env.DATABASE_URL);
    const results = await sql`
      SELECT r.id, r.student_id, r.subject_name, r.year, r.semester, r.marks, r.grade, r.credit_hours
      FROM results r
      INNER JOIN students s ON s.student_id = r.student_id
      WHERE s.department = ${department}
      ORDER BY r.student_id, r.year ASC, r.semester ASC
    `;
    return { statusCode: 200, headers: CORS, body: JSON.stringify({ success: true, results }) };
  } catch (e) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ success: false, message: 'Server error: ' + e.message }) };
  }
};
