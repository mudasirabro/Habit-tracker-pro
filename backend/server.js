require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { initDb, getHabits, addHabit, updateHabit, deleteHabit, toggleHabitEntry, getHabitEntries } = require('./database');
const { loginUser, registerUser, verifyToken, getUserFromToken } = require('./auth');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Initialize database
initDb();

console.log('✅ Server starting...');
console.log('API Key present:', !!process.env.HABITAI_API_KEY);

// ========== AUTH ROUTES ==========

app.post('/api/auth/register', async (req, res) => {
  const { username, email, password } = req.body;
  const result = await registerUser(username, email, password);
  
  if (result.success) {
    res.json(result);
  } else {
    res.status(400).json({ error: result.error });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const result = await loginUser(email, password);
  
  if (result.success) {
    res.json(result);
  } else {
    res.status(401).json({ error: result.error });
  }
});

app.get('/api/auth/verify', async (req, res) => {
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
});

// ========== PROTECTED HABIT ROUTES ==========

app.get('/api/habits', verifyToken, async (req, res) => {
  try {
    const habits = await getHabits(req.userId);
    res.json(habits);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database error' });
  }
});

app.post('/api/habits', verifyToken, async (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Habit name required' });
  }
  try {
    const newHabit = await addHabit(req.userId, name);
    res.json(newHabit);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to add habit' });
  }
});

app.put('/api/habits/:habitId', verifyToken, async (req, res) => {
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
    console.error(error);
    res.status(500).json({ error: 'Failed to update habit' });
  }
});

app.delete('/api/habits/:habitId', verifyToken, async (req, res) => {
  const { habitId } = req.params;
  
  try {
    const deleted = await deleteHabit(req.userId, parseInt(habitId));
    if (deleted) {
      res.json({ message: 'Habit deleted successfully' });
    } else {
      res.status(404).json({ error: 'Habit not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete habit' });
  }
});

app.post('/api/habits/:habitId/toggle', verifyToken, async (req, res) => {
  const { habitId } = req.params;
  const { date, completed } = req.body;
  try {
    const result = await toggleHabitEntry(req.userId, parseInt(habitId), date, completed);
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to toggle habit' });
  }
});

app.get('/api/entries', verifyToken, async (req, res) => {
  try {
    const entries = await getHabitEntries(req.userId);
    res.json(entries);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database error' });
  }
});

// ========== AI COACH ROUTES (Protected) ==========

app.get('/api/test', (req, res) => {
  res.json({ message: 'Server is running!' });
});

app.post('/api/coach/mindfulness', verifyToken, async (req, res) => {
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

app.post('/api/coach/eating', verifyToken, async (req, res) => {
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

app.post('/api/coach/meditation', verifyToken, async (req, res) => {
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

app.listen(PORT, () => {
  console.log(`\n✅ Backend running at http://localhost:${PORT}`);
  console.log(`✅ Auth endpoints: /api/auth/register, /api/auth/login`);
  console.log(`✅ Protected habit endpoints ready`);
});