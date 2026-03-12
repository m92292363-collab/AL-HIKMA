const { neon } = require('@netlify/neon');

const sql = neon(process.env.NETLIFY_DATABASE_URL);

async function initDB() {
  await sql`
    CREATE TABLE IF NOT EXISTS students (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      student_id VARCHAR(100) UNIQUE NOT NULL,
      faculty VARCHAR(255) NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS staff (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      username VARCHAR(100) UNIQUE NOT NULL,
      faculty VARCHAR(255) NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS admins (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      username VARCHAR(100) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS results (
      id SERIAL PRIMARY KEY,
      student_id VARCHAR(100) NOT NULL,
      subject VARCHAR(255) NOT NULL,
      grade VARCHAR(20) NOT NULL,
      semester VARCHAR(100) NOT NULL,
      faculty VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;
}

module.exports = { sql, initDB };
