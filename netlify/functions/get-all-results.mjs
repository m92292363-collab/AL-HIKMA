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
    const sql     = neon(process.env.DATABASE_URL);
    const results = await sql`
      SELECT id, student_id, subject_name, year, semester, marks, grade, credit_hours
      FROM results ORDER BY student_id, year, semester
    `;
    return { statusCode: 200, headers: CORS, body: JSON.stringify({ success: true, results }) };
  } catch (e) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ success: false, message: 'Server error: ' + e.message }) };
  }
};
