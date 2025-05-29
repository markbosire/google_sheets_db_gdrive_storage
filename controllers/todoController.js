// ===== UPDATED FILE: ./controllers/todoController.js =====

const Todo = require('../models/Todo');
const { v4: uuidv4 } = require('uuid');
const { 
  getAllTodosFromSheet, 
  getTodosByUserFromSheet,
  addTodoToSheet,
  updateTodoInSheet,
  deleteTodoFromSheet,
  uploadImageToDrive,
  deleteImageFromDrive
} = require('../services/googleServices');

// Helper function to get todo by ID
async function getTodoById(id) {
  const todos = await getAllTodosFromSheet();
  const todoData = todos.find(t => t.id === id);
  if (!todoData) throw new Error('Todo not found');
  return new Todo(todoData);
}

// Helper function to check if user owns the todo
async function checkTodoOwnership(todoId, userId, userRole) {
  const todo = await getTodoById(todoId);
  
  // Admin can access any todo
  if (userRole === 'admin') {
    return todo;
  }
  
  // Regular users can only access their own todos
  if (todo.userId !== userId) {
    throw new Error('Access denied');
  }
  
  return todo;
}

// Controller functions
async function getAllTodos(req, res) {
  try {
    // Only admins can see all todos
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }
    
    const todosData = await getAllTodosFromSheet();
    const todos = todosData.map(data => new Todo(data));
    res.json(todos);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

async function getUserTodos(req, res) {
  try {
    const userId = req.user.id;
    const todosData = await getTodosByUserFromSheet(userId);
    const todos = todosData.map(data => new Todo(data));
    res.json(todos);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

async function getTodo(req, res) {
  try {
    const todo = await checkTodoOwnership(req.params.id, req.user.id, req.user.role);
    res.json(todo);
  } catch (error) {
    if (error.message === 'Access denied') {
      res.status(403).json({ message: error.message });
    } else {
      res.status(404).json({ message: error.message });
    }
  }
}

async function createTodo(req, res) {
  try {
    // Generate unique ID
    const id = uuidv4();
    const now = new Date().toISOString();
    
    // Handle image upload if present
    let imageData = { id: '', link: '' };
    if (req.file) {
      imageData = await uploadImageToDrive(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype
      );
    }

    // Create todo object with user ID from JWT token
    const todoData = {
      id,
      title: req.body.title,
      description: req.body.description || '',
      imageId: imageData.id,
      imageLink: imageData.link,
      createdAt: now,
      updatedAt: now,
      completed: req.body.completed || false,
      userId: req.user.id // Get userId from JWT token
    };

    const todo = new Todo(todoData);
    todo.validate();
    
    // Add to sheet
    await addTodoToSheet(todo);
    
    // Return the created todo
    res.status(201).json(todo);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
}

async function updateTodo(req, res) {
  try {
    const existingTodo = await checkTodoOwnership(req.params.id, req.user.id, req.user.role);
    const now = new Date().toISOString();
    
    // Handle image operations
    let imageData = { 
      id: existingTodo.imageId, 
      link: existingTodo.imageLink 
    };

    // If new image uploaded, replace the old one
    if (req.file) {
      // Delete old image if exists
      if (existingTodo.imageId) {
        await deleteImageFromDrive(existingTodo.imageId);
      }
      
      // Upload new image
      imageData = await uploadImageToDrive(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype
      );
    }

    // Create updated todo
    const todoData = {
      id: req.params.id,
      title: req.body.title || existingTodo.title,
      description: req.body.description !== undefined ? req.body.description : existingTodo.description,
      imageId: imageData.id,
      imageLink: imageData.link,
      createdAt: existingTodo.createdAt,
      updatedAt: now,
      completed: req.body.completed !== undefined ? req.body.completed : existingTodo.completed,
      userId: existingTodo.userId // Keep original userId
    };

    const todo = new Todo(todoData);
    todo.validate();
    
    // Update in sheet (need to update range to include userId column)
    await updateTodoInSheet(req.params.id, todo);
    
    res.json(todo);
  } catch (error) {
    if (error.message === 'Access denied') {
      res.status(403).json({ message: error.message });
    } else {
      res.status(404).json({ message: error.message });
    }
  }
}

async function deleteTodo(req, res) {
  try {
    const existingTodo = await checkTodoOwnership(req.params.id, req.user.id, req.user.role);
    
    // Delete associated image if exists
    if (existingTodo.imageId) {
      await deleteImageFromDrive(existingTodo.imageId);
    }
    
    // Delete from sheet
    await deleteTodoFromSheet(req.params.id);
    
    res.json({ 
      id: req.params.id, 
      message: 'Todo deleted successfully' 
    });
  } catch (error) {
    if (error.message === 'Access denied') {
      res.status(403).json({ message: error.message });
    } else {
      res.status(404).json({ message: error.message });
    }
  }
}

module.exports = {
  getAllTodos,
  getUserTodos, // Added this missing function
  getTodo,
  createTodo,
  updateTodo,
  deleteTodo
};