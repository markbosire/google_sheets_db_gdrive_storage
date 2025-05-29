// ===== UPDATED FILE: ./controllers/authController.js =====

const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const jwtConfig = require('../config/jwtConfig');
const User = require('../models/User');
const { 
  getAllUsersFromSheet,
  addUserToSheet,
  getUserByUsernameFromSheet
} = require('../services/googleServices');

async function register(req, res) {
  try {
    const { username, password } = req.body;
    
    // Check if user already exists
    const existingUser = await getUserByUsernameFromSheet(username);
    if (existingUser) {
      return res.status(400).json({ message: 'Username already exists' });
    }

    // Create new user
    const id = uuidv4();
    const now = new Date().toISOString();
    
    const userData = {
      id,
      username,
      password,
      role: 'user', // Default role
      createdAt: now
    };

    const newUser = new User(userData);
    
    // Validate and hash password
    newUser.validate();
    await newUser.hashPassword();

    // Add to Google Sheet
    await addUserToSheet(newUser);

    // Return user data (without password)
    res.status(201).json(newUser.toJSON());
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
}

async function login(req, res) {
  try {
    const { username, password } = req.body;
    
    // Get user from sheet
    const userData = await getUserByUsernameFromSheet(username);
    if (!userData) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = new User(userData);
    
    // Compare password
    if (!(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      jwtConfig.secret,
      { expiresIn: jwtConfig.expiresIn }
    );

    res.json({ 
      token,
      user: user.toJSON()
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
}

// Optional: Function to initialize admin user (run once)
async function initializeAdminUser() {
  try {
    const adminUsername = 'admin';
    const existingAdmin = await getUserByUsernameFromSheet(adminUsername);
    
    if (!existingAdmin) {
      const adminUser = new User({
        id: uuidv4(),
        username: adminUsername,
        password: 'admin123',
        role: 'admin',
        createdAt: new Date().toISOString()
      });
      
      await adminUser.hashPassword();
      await addUserToSheet(adminUser);
      console.log('Admin user created successfully');
    } else {
      console.log('Admin user already exists');
    }
  } catch (error) {
    console.error('Error initializing admin user:', error);
  }
}

module.exports = {
  register,
  login,
  initializeAdminUser
};