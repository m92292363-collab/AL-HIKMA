const jwt = require('jsonwebtoken');
const { sql, initDB } = require('./_db');

const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret';

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') return { statusCode: 405, body: 'Method Not Allowed' };

  try {
    await initDB();
    const authHeader = event.headers.authorization || '';
    const token = authHeader.replace('Bearer ', '');
    if (!token) return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };

    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== 'student') {
      return { statusCode: 403, body: JSON.stringify({ error: 'Access denied' }) };
    }

    const students = await sql`SELECT * FROM students WHERE id = ${decoded.id}`;
    if (!students.length) return { statusCode: 404, body: JSON.stringify({ error: 'Student not found' }) };

    const student = students[0];
    const results = await sql`
      SELECT * FROM results WHERE student_id = ${student.student_id} ORDER BY created_at DESC
    `;

    return {
      statusCode: 200,
      body: JSON.stringify({
        student: {
          name: student.name,
          student_id: student.student_id,
          faculty: student.faculty
        },
        results
      })
    };
  } catch (err) {
    console.error(err);
    return { statusCode: 401, body: JSON.stringify({ error: 'Invalid token' }) };
  }
};
