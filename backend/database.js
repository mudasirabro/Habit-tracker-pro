const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

// Configure PostgreSQL connection pool
const isProduction = process.env.NODE_ENV === 'production';
const connectionString = process.env.DATABASE_URL;

const poolConfig = {
  connectionString: connectionString || 'postgresql://postgres:postgres@localhost:5432/habit_tracker',
};

// Enable SSL for Neon.tech or production environments
if (connectionString && (connectionString.includes('neon.tech') || connectionString.includes('sslmode=require') || isProduction)) {
  poolConfig.ssl = {
    rejectUnauthorized: false
  };
}

const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  console.error('❌ Unexpected PostgreSQL client error:', err);
});

// Initialize PostgreSQL tables
async function initDb() {
  try {
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
      console.log('✅ PostgreSQL database tables initialized successfully');
    } catch (tableError) {
      await client.query('ROLLBACK');
      console.error('❌ Error creating PostgreSQL tables:', tableError);
      throw tableError;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('❌ PostgreSQL connection error during initDb:', err.message);
    if (!connectionString) {
      console.warn('⚠️ DATABASE_URL is not set. Please set your Neon.tech connection string in .env');
    }
  }
}

// ========== USER AUTHENTICATION ==========

async function createUser(username, email, password) {
  const hashedPassword = bcrypt.hashSync(password, 10);
  const result = await pool.query(
    'INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING id, username, email',
    [username, email, hashedPassword]
  );
  return result.rows[0];
}

async function findUserByEmail(email) {
  const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  return result.rows[0] || null;
}

async function findUserById(id) {
  const result = await pool.query('SELECT id, username, email, created_at FROM users WHERE id = $1', [id]);
  return result.rows[0] || null;
}

function verifyPassword(password, hashedPassword) {
  if (!password || !hashedPassword) return false;
  return bcrypt.compareSync(password, hashedPassword);
}

// Google OAuth - Find or create user by Google ID
async function findOrCreateGoogleUser(googleId, email, displayName) {
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
  const result = await pool.query(
    'SELECT * FROM habits WHERE user_id = $1 ORDER BY created_at DESC',
    [userId]
  );
  return result.rows || [];
}

async function addHabit(userId, name) {
  const result = await pool.query(
    'INSERT INTO habits (user_id, name) VALUES ($1, $2) RETURNING id, name',
    [userId, name]
  );
  return result.rows[0];
}

async function updateHabit(userId, habitId, name) {
  const result = await pool.query(
    'UPDATE habits SET name = $1 WHERE id = $2 AND user_id = $3',
    [name, habitId, userId]
  );
  return (result.rowCount || 0) > 0;
}

async function deleteHabit(userId, habitId) {
  const result = await pool.query(
    'DELETE FROM habits WHERE id = $1 AND user_id = $2',
    [habitId, userId]
  );
  return (result.rowCount || 0) > 0;
}

async function toggleHabitEntry(userId, habitId, date, completed) {
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