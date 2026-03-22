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

  let grades;
  try {
    ({ grades } = JSON.parse(event.body || '{}'));
  } catch {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ success: false, message: 'Invalid request body' }) };
  }

  if (!grades || !Array.isArray(grades) || grades.length === 0)
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ success: false, message: 'No grades provided' }) };

  for (const g of grades) {
    if (!g.grade || g.min_marks === undefined || g.max_marks === undefined || g.grade_point === undefined)
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ success: false, message: 'Each grade must have grade, min_marks, max_marks, grade_point' }) };
    if (g.min_marks < 0 || g.max_marks > 100 || g.min_marks > g.max_marks)
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ success: false, message: `Invalid range for grade ${g.grade}` }) };
  }

  try {
    const sql = neon(process.env.DATABASE_URL);

    await sql`
      CREATE TABLE IF NOT EXISTS grading_system (
        id          SERIAL PRIMARY KEY,
        grade       VARCHAR(5)   NOT NULL UNIQUE,
        min_marks   NUMERIC(5,2) NOT NULL,
        max_marks   NUMERIC(5,2) NOT NULL,
        grade_point NUMERIC(3,2) NOT NULL,
        updated_at  TIMESTAMPTZ  DEFAULT NOW()
      )
    `;

    await sql`DELETE FROM grading_system`;

    for (const g of grades) {
      await sql`
        INSERT INTO grading_system (grade, min_marks, max_marks, grade_point)
        VALUES (${g.grade}, ${g.min_marks}, ${g.max_marks}, ${g.grade_point})
      `;
    }

    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify({ success: true, message: 'Grading system saved successfully' }),
    };
  } catch (e) {
    console.error('[save-grading]', e.message);
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ success: false, message: 'Server error: ' + e.message }) };
  }
};
