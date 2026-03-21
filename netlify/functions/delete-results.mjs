import { neon } from '@neondatabase/serverless';
import jwt from 'jsonwebtoken';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

function verifyAdmin(event) {
  const auth = event.headers['authorization'] || event.headers['Authorization'] || '';
  const token = auth.replace('Bearer ', '');
  if (!token) throw new Error('Unauthorized');
  return jwt.verify(token, process.env.JWT_SECRET);
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };
  if (event.httpMethod !== 'DELETE') return { statusCode: 405, headers: CORS, body: JSON.stringify({ success: false, message: 'Method not allowed' }) };

  try { verifyAdmin(event); } catch { return { statusCode: 401, headers: CORS, body: JSON.stringify({ success: false, message: 'Unauthorized' }) }; }

  let id;
  try {
    ({ id } = JSON.parse(event.body || '{}'));
  } catch {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ success: false, message: 'Invalid request body' }) };
  }

  if (!id) return { statusCode: 400, headers: CORS, body: JSON.stringify({ success: false, message: 'Result id required' }) };

  try {
    const sql = neon(process.env.DATABASE_URL);
    await sql`DELETE FROM results WHERE id = ${id}`;
    return { statusCode: 200, headers: CORS, body: JSON.stringify({ success: true, message: 'Result deleted' }) };
  } catch (e) {
    console.error('[delete-results]', e.message);
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ success: false, message: 'Server error' }) };
  }
};
