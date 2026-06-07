const jwt = require('jsonwebtoken');
const { findUserByEmail, verifyPassword, createUser, findUserById } = require('./database');

const JWT_SECRET = process.env.JWT_SECRET || 'habit_tracker_secret_key_change_me';
const JWT_EXPIRES_IN = '7d';

async function loginUser(email, password) {
  try {
    const user = await findUserByEmail(email);
    if (!user) {
      return { success: false, error: 'User not found' };
    }
    
    const isValid = verifyPassword(password, user.password);
    if (!isValid) {
      return { success: false, error: 'Invalid password' };
    }
    
    const token = jwt.sign(
      { id: user.id, email: user.email, username: user.username },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
    
    return {
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    };
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, error: 'Server error' };
  }
}

async function registerUser(username, email, password) {
  try {
    if (!username || !email || !password) {
      return { success: false, error: 'All fields are required' };
    }
    
    if (password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters' };
    }
    
    const user = await createUser(username, email, password);
    
    const token = jwt.sign(
      { id: user.id, email, username },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
    
    return {
      success: true,
      token,
      user: {
        id: user.id,
        username,
        email
      }
    };
  } catch (error) {
    console.error('Register error:', error);
    if (error.message && error.message.includes('UNIQUE')) {
      return { success: false, error: 'Username or email already exists' };
    }
    return { success: false, error: 'Server error' };
  }
}

function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  const token = authHeader.split(' ')[1];
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.id;
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

async function getUserFromToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await findUserById(decoded.id);
    return user;
  } catch (error) {
    return null;
  }
}

module.exports = {
  loginUser,
  registerUser,
  verifyToken,
  getUserFromToken,
  JWT_SECRET
};