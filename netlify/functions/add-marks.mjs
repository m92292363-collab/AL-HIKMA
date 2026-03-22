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

  let student_id, subject_name, year, semester, marks, credit_hours;
  try {
    ({ student_id, subject_name, year, semester, marks, credit_hours } = JSON.parse(event.body || '{}'));
  } catch {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ success: false, message: 'Invalid request body' }) };
  }

  if (!student_id || !subject_name || !year || !semester || marks === undefined || !credit_hours)
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ success: false, message: 'All fields required' }) };

  if (marks < 0 || marks > 100)
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ success: false, message: 'Marks must be 0-100' }) };

  try {
    const sql     = neon(process.env.DATABASE_URL);
    const student = await sql`SELECT id FROM students WHERE student_id = ${student_id}`;
    if (!student.length)
      return { statusCode: 404, headers: CORS, body: JSON.stringify({ success: false, message: 'Student not found' }) };

    const grade = await getGradeFromMarks(sql, marks);

    await sql`
      INSERT INTO results (student_id, subject_name, year, semester, marks, grade, credit_hours)
      VALUES (${student_id}, ${subject_name}, ${year}, ${semester}, ${marks}, ${grade}, ${credit_hours})
      ON CONFLICT (student_id, subject_name, year, semester)
      DO UPDATE SET marks = ${marks}, grade = ${grade}, credit_hours = ${credit_hours}
    `;

    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify({ success: true, message: 'Result saved', grade }),
    };
  } catch (e) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ success: false, message: 'Server error: ' + e.message }) };
  }
};
