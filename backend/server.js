const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { initDb, getHabits, addHabit, updateHabit, deleteHabit, toggleHabitEntry, getHabitEntries } = require('./database');
const { loginUser, registerUser, verifyToken, getUserFromToken } = require('./auth');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Create Router for all API routes (mounted at both /api and / for Vercel Serverless compatibility)
const router = express.Router();

// Root and Health status
router.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Habit Tracker Pro API',
    database: 'PostgreSQL (Neon.tech)',
    timestamp: new Date().toISOString()
  });
});

router.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', uptime: process.uptime() });
});

router.get('/test', (req, res) => {
  res.json({ message: 'Server is running!' });
});

// ========== AUTH ROUTES ==========

router.post('/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const result = await registerUser(username, email, password);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

router.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await loginUser(email, password);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(401).json({ error: result.error });
    }
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

router.get('/auth/verify', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'No token' });
    }
    
    const user = await getUserFromToken(token);
    if (user) {
      res.json({ valid: true, user });
    } else {
      res.status(401).json({ valid: false });
    }
  } catch (err) {
    res.status(500).json({ error: err.message || 'Verification error' });
  }
});

// ========== PROTECTED HABIT ROUTES ==========

router.get('/habits', verifyToken, async (req, res) => {
  try {
    const habits = await getHabits(req.userId);
    res.json(habits);
  } catch (error) {
    console.error('getHabits error:', error);
    res.status(500).json({ error: error.message || 'Database error' });
  }
});

router.post('/habits', verifyToken, async (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Habit name required' });
  }
  try {
    const newHabit = await addHabit(req.userId, name);
    res.json(newHabit);
  } catch (error) {
    console.error('addHabit error:', error);
    res.status(500).json({ error: error.message || 'Failed to add habit' });
  }
});

router.put('/habits/:habitId', verifyToken, async (req, res) => {
  const { habitId } = req.params;
  const { name } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: 'Habit name required' });
  }
  
  try {
    const updated = await updateHabit(req.userId, parseInt(habitId), name);
    if (updated) {
      res.json({ id: parseInt(habitId), name });
    } else {
      res.status(404).json({ error: 'Habit not found' });
    }
  } catch (error) {
    console.error('updateHabit error:', error);
    res.status(500).json({ error: error.message || 'Failed to update habit' });
  }
});

router.delete('/habits/:habitId', verifyToken, async (req, res) => {
  const { habitId } = req.params;
  
  try {
    const deleted = await deleteHabit(req.userId, parseInt(habitId));
    if (deleted) {
      res.json({ message: 'Habit deleted successfully' });
    } else {
      res.status(404).json({ error: 'Habit not found' });
    }
  } catch (error) {
    console.error('deleteHabit error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete habit' });
  }
});

router.post('/habits/:habitId/toggle', verifyToken, async (req, res) => {
  const { habitId } = req.params;
  const { date, completed } = req.body;
  try {
    const result = await toggleHabitEntry(req.userId, parseInt(habitId), date, completed);
    res.json(result);
  } catch (error) {
    console.error('toggleHabitEntry error:', error);
    res.status(500).json({ error: error.message || 'Failed to toggle habit' });
  }
});

router.get('/entries', verifyToken, async (req, res) => {
  try {
    const entries = await getHabitEntries(req.userId);
    res.json(entries);
  } catch (error) {
    console.error('getHabitEntries error:', error);
    res.status(500).json({ error: error.message || 'Database error' });
  }
});

// ========== AI COACH ROUTES ==========

router.post('/coach/mindfulness', verifyToken, async (req, res) => {
  try {
    const { userMessage } = req.body;
    const apiKey = process.env.HABITAI_API_KEY;
    
    if (!apiKey) {
      return res.json({ success: true, advice: "💪 Keep going! Small steps lead to big changes." });
    }
    
    const response = await fetch('https://habitapp.ai/api/v1/coaches/mindfulness', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: userMessage || "Give me motivational advice.",
        user_id: `user_${req.userId}`
      })
    });
    
    const data = await response.json();
    const advice = data.reply || data.advice || data.message || "💪 Keep showing up! Small steps lead to big changes.";
    
    res.json({ success: true, advice: advice });
  } catch (error) {
    console.error('AI Coach error:', error);
    res.json({ success: true, advice: "💪 Keep showing up! Small steps lead to big changes. You've got this!" });
  }
});

router.post('/coach/eating', verifyToken, async (req, res) => {
  try {
    const { goal } = req.body;
    const apiKey = process.env.HABITAI_API_KEY;
    
    if (!apiKey) {
      return res.json({ success: true, suggestions: "🥗 Drink water before meals, add one vegetable to dinner." });
    }
    
    const response = await fetch('https://habitapp.ai/api/v1/coaches/eating', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: `Give simple eating advice for: ${goal || 'eating healthier'}. Keep it short.`,
        user_id: `user_${req.userId}`
      })
    });
    
    const data = await response.json();
    const suggestions = data.reply || data.advice || "🥗 Drink water before meals, add one vegetable to dinner.";
    
    res.json({ success: true, suggestions: suggestions });
  } catch (error) {
    res.json({ success: true, suggestions: "🥗 Small changes: drink water, add vegetables, eat slowly." });
  }
});

router.post('/coach/meditation', verifyToken, async (req, res) => {
  try {
    const { question } = req.body;
    const apiKey = process.env.HABITAI_API_KEY;
    
    if (!apiKey) {
      return res.json({ success: true, response: "🧘 Start with 1 minute of deep breathing daily." });
    }
    
    const response = await fetch('https://habitapp.ai/api/v1/coaches/meditation', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: question || "Explain benefits of meditation briefly.",
        user_id: `user_${req.userId}`
      })
    });
    
    const data = await response.json();
    const responseText = data.reply || data.advice || "🧘 Start with 1 minute of deep breathing daily.";
    
    res.json({ success: true, response: responseText });
  } catch (error) {
    res.json({ success: true, response: "🧘 Breathe in for 4 seconds, hold for 4, exhale for 4. Do this daily." });
  }
});

// Mount router on both '/api' and '/' to ensure total compatibility with Vercel rewrites
app.use('/api', router);
app.use('/', router);

// Trigger background table initialization
initDb().catch(err => console.error('Database startup init warning:', err.message));

if (require.main === module || !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`\n✅ Backend running at http://localhost:${PORT}`);
    console.log(`✅ Auth endpoints: /api/auth/register, /api/auth/login`);
    console.log(`✅ Protected habit endpoints ready`);
  });
}

module.exports = app;