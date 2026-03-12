const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sql, initDB } = require('./_db');

const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret';

function auth(event) {
  const token = (event.headers.authorization || '').replace('Bearer ', '');
  const decoded = jwt.verify(token, JWT_SECRET);
  if (decoded.role !== 'admin' && decoded.role !== 'staff') throw new Error('Unauthorized');
  return decoded;
}

exports.handler = async (event) => {
  try {
    await initDB();
    const user = auth(event);
    const isAdmin = user.role === 'admin';

    if (event.httpMethod === 'GET') {
      const results = isAdmin
        ? await sql`SELECT * FROM results ORDER BY created_at DESC`
        : await sql`SELECT * FROM results WHERE faculty = ${user.faculty} ORDER BY created_at DESC`;
      return { statusCode: 200, body: JSON.stringify({ results }) };
    }

    if (event.httpMethod === 'POST') {
      const { student_id, subject, grade, semester, faculty } = JSON.parse(event.body);
      // Staff can only add results for their own faculty
      if (!isAdmin && faculty !== user.faculty) {
        return { statusCode: 403, body: JSON.stringify({ error: 'You can only add results for ' + user.faculty }) };
      }
      await sql`INSERT INTO results (student_id, subject, grade, semester, faculty) VALUES (${student_id}, ${subject}, ${grade}, ${semester}, ${faculty})`;
      return { statusCode: 201, body: JSON.stringify({ success: true }) };
    }

    if (event.httpMethod === 'DELETE') {
      const { id } = JSON.parse(event.body);
      // Staff can only delete results from their faculty
      if (!isAdmin) {
        const rows = await sql`SELECT * FROM results WHERE id = ${id}`;
        if (!rows.length || rows[0].faculty !== user.faculty) {
          return { statusCode: 403, body: JSON.stringify({ error: 'Access denied' }) };
        }
      }
      await sql`DELETE FROM results WHERE id = ${id}`;
      return { statusCode: 200, body: JSON.stringify({ success: true }) };
    }

    return { statusCode: 405, body: 'Method Not Allowed' };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
