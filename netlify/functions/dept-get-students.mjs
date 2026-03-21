import { neon } from '@neondatabase/serverless';
import jwt from 'jsonwebtoken';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

function verifyDept(event) {
  const auth  = event.headers['authorization'] || event.headers['Authorization'] || '';
  const token = auth.replace('Bearer ', '');
  if (!token) throw new Error('Unauthorized');
  return jwt.verify(token, process.env.JWT_SECRET);
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };

  let decoded;
  try { decoded = verifyDept(event); }
  catch { return { statusCode: 401, headers: CORS, body: JSON.stringify({ success: false, message: 'Unauthorized' }) }; }

  try {
    const sql      = neon(process.env.DATABASE_URL);
    const students = await sql`
      SELECT student_id, email, full_name, faculty, department, year, created_at
      FROM students
      WHERE department = ${decoded.department}
      ORDER BY year ASC, full_name ASC
    `;

    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify({
        success:    true,
        students,
        department: decoded.department,
        faculty:    decoded.faculty,
      }),
    };
  } catch (e) {
    console.error('[dept-get-students]', e.message);
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ success: false, message: 'Server error' }) };
  }
};
