const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.resolve(__dirname, 'habits.db');
const db = new sqlite3.Database(dbPath);

// Initialize tables
function initDb() {
  db.serialize(() => {
    // Users table with google_id support
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        email TEXT UNIQUE NOT NULL,
        password TEXT,
        google_id TEXT UNIQUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Habits table
    db.run(`
      CREATE TABLE IF NOT EXISTS habits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Habit entries table
    db.run(`
      CREATE TABLE IF NOT EXISTS habit_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        habit_id INTEGER NOT NULL,
        date TEXT NOT NULL,
        completed INTEGER DEFAULT 0,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (habit_id) REFERENCES habits(id) ON DELETE CASCADE,
        UNIQUE(user_id, habit_id, date)
      )
    `);
  });
  console.log('✅ Database tables initialized');
}

// ========== USER AUTHENTICATION ==========

function createUser(username, email, password) {
  return new Promise((resolve, reject) => {
    const hashedPassword = bcrypt.hashSync(password, 10);
    db.run('INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
      [username, email, hashedPassword],
      function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, username, email });
      });
  });
}

function findUserByEmail(email) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM users WHERE email = ?', [email], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function findUserById(id) {
  return new Promise((resolve, reject) => {
    db.get('SELECT id, username, email, created_at FROM users WHERE id = ?', [id], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function verifyPassword(password, hashedPassword) {
  return bcrypt.compareSync(password, hashedPassword);
}

// Google OAuth - Find or create user by Google ID
function findOrCreateGoogleUser(googleId, email, displayName) {
  return new Promise((resolve, reject) => {
    // First check if user exists with this Google ID
    db.get('SELECT * FROM users WHERE google_id = ?', [googleId], (err, user) => {
      if (err) {
        reject(err);
        return;
      }
      
      if (user) {
        resolve(user);
        return;
      }
      
      // Check if user exists with this email
      db.get('SELECT * FROM users WHERE email = ?', [email], (err, existingUser) => {
        if (err) {
          reject(err);
          return;
        }
        
        if (existingUser) {
          // Link Google ID to existing account
          db.run('UPDATE users SET google_id = ? WHERE id = ?', [googleId, existingUser.id], (err) => {
            if (err) reject(err);
            else resolve(existingUser);
          });
        } else {
          // Create new user
          const username = displayName.toLowerCase().replace(/\s/g, '_') + '_' + Math.floor(Math.random() * 1000);
          db.run('INSERT INTO users (username, email, google_id, created_at) VALUES (?, ?, ?, ?)',
            [username, email, googleId, new Date().toISOString()],
            function(err) {
              if (err) reject(err);
              else resolve({ id: this.lastID, username, email, google_id: googleId });
            });
        }
      });
    });
  });
}

// ========== HABITS (User-specific) ==========

function getHabits(userId) {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM habits WHERE user_id = ? ORDER BY created_at DESC', [userId], (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}

function addHabit(userId, name) {
  return new Promise((resolve, reject) => {
    db.run('INSERT INTO habits (user_id, name) VALUES (?, ?)', [userId, name], function(err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, name });
    });
  });
}

function updateHabit(userId, habitId, name) {
  return new Promise((resolve, reject) => {
    db.run('UPDATE habits SET name = ? WHERE id = ? AND user_id = ?', [name, habitId, userId], function(err) {
      if (err) reject(err);
      else resolve(this.changes > 0);
    });
  });
}

function deleteHabit(userId, habitId) {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM habits WHERE id = ? AND user_id = ?', [habitId, userId], function(err) {
      if (err) reject(err);
      else resolve(this.changes > 0);
    });
  });
}

function toggleHabitEntry(userId, habitId, date, completed) {
  return new Promise((resolve, reject) => {
    db.get('SELECT id FROM habit_entries WHERE user_id = ? AND habit_id = ? AND date = ?',
      [userId, habitId, date], (err, row) => {
        if (err) {
          reject(err);
          return;
        }
        
        if (row) {
          db.run('UPDATE habit_entries SET completed = ? WHERE user_id = ? AND habit_id = ? AND date = ?',
            [completed ? 1 : 0, userId, habitId, date],
            (err) => {
              if (err) reject(err);
              else resolve({ habitId, date, completed });
            });
        } else {
          db.run('INSERT INTO habit_entries (user_id, habit_id, date, completed) VALUES (?, ?, ?, ?)',
            [userId, habitId, date, completed ? 1 : 0],
            (err) => {
              if (err) reject(err);
              else resolve({ habitId, date, completed });
            });
        }
      });
  });
}

function getHabitEntries(userId) {
  return new Promise((resolve, reject) => {
    db.all(`
      SELECT he.*, h.name as habit_name 
      FROM habit_entries he
      JOIN habits h ON h.id = he.habit_id
      WHERE he.user_id = ?
      ORDER BY he.date DESC
    `, [userId], (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}

module.exports = {
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