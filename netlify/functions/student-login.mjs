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

function gradePoint(grade, scale) {
  const g = scale.find(s => s.grade === grade);
  return g ? parseFloat(g.grade_point) : 0;
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: CORS, body: JSON.stringify({ success: false, message: 'Method not allowed' }) };

  let email, password;
  try {
    ({ email, password } = JSON.parse(event.body || '{}'));
  } catch {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ success: false, message: 'Invalid request body' }) };
  }

  if (!email || !password)
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ success: false, message: 'Email and password required' }) };

  try {
    const sql = neon(process.env.DATABASE_URL);

    // Find student by email with plain text password
    const rows = await sql`
      SELECT * FROM students
      WHERE LOWER(email) = LOWER(${email})
      AND password_hash = ${password}
      LIMIT 1
    `;

    if (!rows.length)
      return { statusCode: 401, headers: CORS, body: JSON.stringify({ success: false, message: 'Invalid email or password' }) };

    const student = rows[0];

    // Fetch results
    const results = await sql`
      SELECT subject_name, year, semester, marks, grade, credit_hours
      FROM results
      WHERE student_id = ${student.student_id}
      ORDER BY year ASC, semester ASC, subject_name ASC
    `;

    // Fetch grading scale for GPA calculation
    let gradeScale = DEFAULT_GRADES;
    try {
      const gs = await sql`SELECT grade, grade_point FROM grading_system ORDER BY min_marks DESC`;
      if (gs.length) gradeScale = gs;
    } catch { /* use defaults */ }

    // Calculate CGPA
    let totalPts = 0, totalHrs = 0;
    const enriched = results.map(r => {
      const pass = parseFloat(r.marks) >= 50;
      const gp   = gradePoint(r.grade, gradeScale);
      totalPts += gp * parseFloat(r.credit_hours);
      totalHrs += parseFloat(r.credit_hours);
      return { ...r, pass };
    });

    const cgpa = totalHrs ? (totalPts / totalHrs).toFixed(2) : null;

    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify({
        success: true,
        student: {
          student_id:  student.student_id,
          full_name:   student.full_name,
          email:       student.email,
          faculty:     student.faculty,
          department:  student.department,
          year:        student.year,
          cgpa,
        },
        results: enriched,
      }),
    };
  } catch (e) {
    console.error('[student-login]', e.message);
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ success: false, message: 'Server error: ' + e.message }) };
  }
};
