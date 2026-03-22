import { neon } from '@neondatabase/serverless';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

const DEFAULT_GRADES = [
  { grade:'A+', min_marks:90 }, { grade:'A',  min_marks:85 },
  { grade:'A-', min_marks:80 }, { grade:'B+', min_marks:75 },
  { grade:'B',  min_marks:70 }, { grade:'B-', min_marks:65 },
  { grade:'C+', min_marks:60 }, { grade:'C',  min_marks:55 },
  { grade:'C-', min_marks:50 }, { grade:'D',  min_marks:45 },
  { grade:'F',  min_marks:0  },
];

async function getGradeFromMarks(sql, marks) {
  try {
    const rows  = await sql`SELECT grade, min_marks FROM grading_system ORDER BY min_marks DESC`;
    const scale = rows.length ? rows : DEFAULT_GRADES;
    for (const g of scale) {
      if (marks >= parseFloat(g.min_marks)) return g.grade;
    }
    return 'F';
  } catch {
    for (const g of DEFAULT_GRADES) {
      if (marks >= g.min_marks) return g.grade;
    }
    return 'F';
  }
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: CORS, body: JSON.stringify({ success: false, message: 'Method not allowed' }) };

  let results;
  try {
    ({ results } = JSON.parse(event.body || '{}'));
  } catch {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ success: false, message: 'Invalid request body' }) };
  }

  if (!results || !Array.isArray(results) || results.length === 0)
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ success: false, message: 'No results provided' }) };

  try {
    const sql = neon(process.env.DATABASE_URL);
    let inserted = 0, skipped = 0, errors = [];

    for (const r of results) {
      const { student_id, subject_name, year, semester, marks, credit_hours } = r;

      if (!student_id || !subject_name || marks === undefined || marks === null) {
        skipped++;
        continue;
      }

      const marksNum = parseFloat(marks);
      if (isNaN(marksNum) || marksNum < 0 || marksNum > 100) {
        errors.push(`${student_id}: invalid marks (${marks})`);
        skipped++;
        continue;
      }

      const existing = await sql`SELECT id FROM students WHERE student_id = ${student_id}`;
      if (!existing.length) {
        errors.push(`${student_id}: student not found`);
        skipped++;
        continue;
      }

      const grade = await getGradeFromMarks(sql, marksNum);

      await sql`
        INSERT INTO results (student_id, subject_name, year, semester, marks, grade, credit_hours)
        VALUES (${student_id}, ${subject_name}, ${year}, ${semester}, ${marksNum}, ${grade}, ${credit_hours || 3})
        ON CONFLICT (student_id, subject_name, year, semester)
        DO UPDATE SET marks = ${marksNum}, grade = ${grade}, credit_hours = ${credit_hours || 3}
      `;
      inserted++;
    }

    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify({
        success: true,
        message: `${inserted} results saved, ${skipped} skipped.`,
        inserted,
        skipped,
        errors,
      }),
    };
  } catch (e) {
    console.error('[bulk-results]', e.message);
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ success: false, message: 'Server error: ' + e.message }) };
  }
};
