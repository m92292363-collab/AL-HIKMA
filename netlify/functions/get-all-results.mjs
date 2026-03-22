import { neon } from '@neondatabase/serverless';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };

  try {
    const sql      = neon(process.env.DATABASE_URL);
    const students = await sql`
      SELECT student_id, email, full_name, faculty, department, year, created_at
      FROM students ORDER BY created_at DESC
    `;
    return { statusCode: 200, headers: CORS, body: JSON.stringify({ success: true, students }) };
  } catch (e) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ success: false, message: 'Server error: ' + e.message }) };
  }
};
