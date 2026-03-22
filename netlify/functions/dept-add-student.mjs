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

  let student_id, full_name, email, year, password, faculty, department;
  try {
    ({ student_id, full_name, email, year, password, faculty, department } = JSON.parse(event.body || '{}'));
  } catch {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ success: false, message: 'Invalid request body' }) };
  }

  if (!student_id || !full_name || !email || !year || !password || !faculty || !department)
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ success: false, message: 'All fields are required' }) };

  try {
    const sql      = neon(process.env.DATABASE_URL);
    const existing = await sql`
      SELECT id FROM students
      WHERE student_id = ${student_id} OR email = ${email}
    `;

    if (existing.length)
      return { statusCode: 409, headers: CORS, body: JSON.stringify({ success: false, message: 'Student ID or email already exists' }) };

    // Faculty and department come from the request body (sent by dept portal from JWT/session)
    // Department staff cannot override these — they are locked to their own dept on the frontend
    await sql`
      INSERT INTO students (student_id, email, full_name, faculty, department, year, password_hash)
      VALUES (
        ${student_id},
        ${email.toLowerCase()},
        ${full_name},
        ${faculty},
        ${department},
        ${year},
        ${password}
      )
    `;

    return {
      statusCode: 201,
      headers: CORS,
      body: JSON.stringify({ success: true, message: 'Student added to your department' }),
    };
  } catch (e) {
    console.error('[dept-add-student]', e.message);
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ success: false, message: 'Server error: ' + e.message }) };
  }
};
