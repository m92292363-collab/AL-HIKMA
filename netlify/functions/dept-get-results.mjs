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
    const sql     = neon(process.env.DATABASE_URL);

    // Only fetch results for students that belong to this department
    const results = await sql`
      SELECT
        r.id,
        r.student_id,
        r.subject_name,
        r.year,
        r.semester,
        r.marks,
        r.grade,
        r.credit_hours
      FROM results r
      INNER JOIN students s ON s.student_id = r.student_id
      WHERE s.department = ${decoded.department}
      ORDER BY r.student_id, r.year ASC, r.semester ASC
    `;

    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify({ success: true, results }),
    };
  } catch (e) {
    console.error('[dept-get-results]', e.message);
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ success: false, message: 'Server error' }) };
  }
};
