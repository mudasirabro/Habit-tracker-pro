const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

// Configure PostgreSQL connection pool
const connectionString = process.env.DATABASE_URL;

const poolConfig = {
  connectionString: connectionString || 'postgresql://postgres:postgres@localhost:5432/habit_tracker',
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
};

// Enable SSL for Neon.tech or serverless / production environments
if (connectionString && (connectionString.includes('neon.tech') || connectionString.includes('sslmode=') || process.env.NODE_ENV === 'production' || process.env.VERCEL)) {
  poolConfig.ssl = {
    rejectUnauthorized: false
  };
}

const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  console.error('❌ Unexpected PostgreSQL client error:', err);
});

let dbInitialized = false;
let initDbPromise = null;

// Initialize PostgreSQL tables
async function initDb() {
  if (dbInitialized) return;
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Users table with google_id support
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255),
        google_id VARCHAR(255) UNIQUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Habits table
    await client.query(`
      CREATE TABLE IF NOT EXISTS habits (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Habit entries table with unique constraint on user_id, habit_id, date
    await client.query(`
      CREATE TABLE IF NOT EXISTS habit_entries (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        habit_id INTEGER NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
        date VARCHAR(50) NOT NULL,
        completed INTEGER DEFAULT 0,
        CONSTRAINT unique_user_habit_date UNIQUE(user_id, habit_id, date)
      );
    `);

    await client.query('COMMIT');
    dbInitialized = true;
    console.log('✅ PostgreSQL database tables initialized successfully');
  } catch (tableError) {
    await client.query('ROLLBACK');
    console.error('❌ Error creating PostgreSQL tables:', tableError);
    throw tableError;
  } finally {
    client.release();
  }
}

// Ensure database tables exist before running any query (essential for serverless cold starts)
async function ensureDb() {
  if (dbInitialized) return;
  if (!initDbPromise) {
    initDbPromise = initDb()
      .then(() => {
        dbInitialized = true;
      })
      .catch((err) => {
        initDbPromise = null;
        console.error('❌ ensureDb failed:', err.message);
        throw err;
      });
  }
  return initDbPromise;
}

// ========== USER AUTHENTICATION ==========

async function createUser(username, email, password) {
  await ensureDb();
  const hashedPassword = bcrypt.hashSync(password, 10);
  const result = await pool.query(
    'INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING id, username, email',
    [username, email, hashedPassword]
  );
  return result.rows[0];
}

async function findUserByEmail(email) {
  await ensureDb();
  const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  return result.rows[0] || null;
}

async function findUserById(id) {
  await ensureDb();
  const result = await pool.query('SELECT id, username, email, created_at FROM users WHERE id = $1', [id]);
  return result.rows[0] || null;
}

function verifyPassword(password, hashedPassword) {
  if (!password || !hashedPassword) return false;
  return bcrypt.compareSync(password, hashedPassword);
}

// Google OAuth - Find or create user by Google ID
async function findOrCreateGoogleUser(googleId, email, displayName) {
  await ensureDb();
  // First check if user exists with this Google ID
  const googleUserRes = await pool.query('SELECT * FROM users WHERE google_id = $1', [googleId]);
  if (googleUserRes.rows[0]) {
    return googleUserRes.rows[0];
  }

  // Check if user exists with this email
  const emailUserRes = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  if (emailUserRes.rows[0]) {
    // Link Google ID to existing account
    const updatedRes = await pool.query(
      'UPDATE users SET google_id = $1 WHERE id = $2 RETURNING id, username, email, google_id',
      [googleId, emailUserRes.rows[0].id]
    );
    return updatedRes.rows[0];
  }

  // Create new user
  const username = (displayName || 'user').toLowerCase().replace(/\s+/g, '_') + '_' + Math.floor(Math.random() * 1000);
  const newRes = await pool.query(
    'INSERT INTO users (username, email, google_id) VALUES ($1, $2, $3) RETURNING id, username, email, google_id',
    [username, email, googleId]
  );
  return newRes.rows[0];
}

// ========== HABITS (User-specific) ==========

async function getHabits(userId) {
  await ensureDb();
  const result = await pool.query(
    'SELECT * FROM habits WHERE user_id = $1 ORDER BY created_at DESC',
    [userId]
  );
  return result.rows || [];
}

async function addHabit(userId, name) {
  await ensureDb();
  const result = await pool.query(
    'INSERT INTO habits (user_id, name) VALUES ($1, $2) RETURNING id, name',
    [userId, name]
  );
  return result.rows[0];
}

async function updateHabit(userId, habitId, name) {
  await ensureDb();
  const result = await pool.query(
    'UPDATE habits SET name = $1 WHERE id = $2 AND user_id = $3',
    [name, habitId, userId]
  );
  return (result.rowCount || 0) > 0;
}

async function deleteHabit(userId, habitId) {
  await ensureDb();
  const result = await pool.query(
    'DELETE FROM habits WHERE id = $1 AND user_id = $2',
    [habitId, userId]
  );
  return (result.rowCount || 0) > 0;
}

async function toggleHabitEntry(userId, habitId, date, completed) {
  await ensureDb();
  const completedVal = completed ? 1 : 0;
  await pool.query(`
    INSERT INTO habit_entries (user_id, habit_id, date, completed)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (user_id, habit_id, date)
    DO UPDATE SET completed = EXCLUDED.completed
  `, [userId, habitId, date, completedVal]);
  return { habitId, date, completed: completedVal };
}

async function getHabitEntries(userId) {
  await ensureDb();
  const result = await pool.query(`
    SELECT he.*, h.name as habit_name 
    FROM habit_entries he
    JOIN habits h ON h.id = he.habit_id
    WHERE he.user_id = $1
    ORDER BY he.date DESC
  `, [userId]);
  return result.rows || [];
}

module.exports = {
  pool,
  initDb,
  ensureDb,
  createUser,
  findUserByEmail,
  findUserById,
  verifyPassword,
  findOrCreateGoogleUser,
  getHabits,
  addHabit,
  updateHabit,
  deleteHabit,
  toggleHabitEntry,
  getHabitEntries
};