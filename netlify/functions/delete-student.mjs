import { neon } from '@neondatabase/serverless';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };
  if (event.httpMethod !== 'DELETE') return { statusCode: 405, headers: CORS, body: JSON.stringify({ success: false, message: 'Method not allowed' }) };

  let student_id;
  try {
    ({ student_id } = JSON.parse(event.body || '{}'));
  } catch {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ success: false, message: 'Invalid request body' }) };
  }

  if (!student_id) return { statusCode: 400, headers: CORS, body: JSON.stringify({ success: false, message: 'student_id required' }) };

  try {
    const sql = neon(process.env.DATABASE_URL);
    await sql`DELETE FROM results WHERE student_id = ${student_id}`;
    await sql`DELETE FROM students WHERE student_id = ${student_id}`;
    return { statusCode: 200, headers: CORS, body: JSON.stringify({ success: true, message: 'Student deleted' }) };
  } catch (e) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ success: false, message: 'Server error: ' + e.message }) };
  }
};
