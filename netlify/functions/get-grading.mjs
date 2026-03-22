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

    const grades = await sql`SELECT * FROM grading_system ORDER BY min_marks DESC`;

    if (!grades.length) {
      const defaults = [
        { grade:'A+', min_marks:90, max_marks:100, grade_point:4.0 },
        { grade:'A',  min_marks:85, max_marks:89,  grade_point:4.0 },
        { grade:'A-', min_marks:80, max_marks:84,  grade_point:3.7 },
        { grade:'B+', min_marks:75, max_marks:79,  grade_point:3.3 },
        { grade:'B',  min_marks:70, max_marks:74,  grade_point:3.0 },
        { grade:'B-', min_marks:65, max_marks:69,  grade_point:2.7 },
        { grade:'C+', min_marks:60, max_marks:64,  grade_point:2.3 },
        { grade:'C',  min_marks:55, max_marks:59,  grade_point:2.0 },
        { grade:'C-', min_marks:50, max_marks:54,  grade_point:1.7 },
        { grade:'D',  min_marks:45, max_marks:49,  grade_point:1.0 },
        { grade:'F',  min_marks:0,  max_marks:44,  grade_point:0.0 },
      ];
      return {
        statusCode: 200,
        headers: CORS,
        body: JSON.stringify({ success: true, grades: defaults, isDefault: true }),
      };
    }

    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify({ success: true, grades, isDefault: false }),
    };
  } catch (e) {
    console.error('[get-grading]', e.message);
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ success: false, message: 'Server error: ' + e.message }) };
  }
};
