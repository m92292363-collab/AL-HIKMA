import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: CORS, body: JSON.stringify({ success: false, message: 'Method not allowed' }) };

  let username, password;
  try {
    ({ username, password } = JSON.parse(event.body || '{}'));
  } catch {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ success: false, message: 'Invalid request body' }) };
  }

  if (!username || !password)
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ success: false, message: 'Username and password required' }) };

  try {
    const sql  = neon(process.env.DATABASE_URL);
    const rows = await sql`SELECT * FROM dept_accounts WHERE username = ${username} LIMIT 1`;

    if (!rows.length)
      return { statusCode: 401, headers: CORS, body: JSON.stringify({ success: false, message: 'Invalid credentials' }) };

    const account = rows[0];
    const valid   = await bcrypt.compare(password, account.password_hash);
    if (!valid)
      return { statusCode: 401, headers: CORS, body: JSON.stringify({ success: false, message: 'Invalid credentials' }) };

    const token = jwt.sign(
      {
        deptId:     account.id,
        username:   account.username,
        department: account.department,
        faculty:    account.faculty,
      },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify({
        success:    true,
        token,
        department: account.department,
        faculty:    account.faculty,
        username:   account.username,
      }),
    };
  } catch (e) {
    console.error('[dept-login]', e.message);
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ success: false, message: 'Server error' }) };
  }
};
