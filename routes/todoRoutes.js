const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer();
const { protect } = require('../middleware/authMiddleware');
const todoController = require('../controllers/todoController');

router.get('/', protect, todoController.getAllTodos); // For admins
router.get('/user', protect, todoController.getUserTodos); // For current user
router.post('/', protect, upload.single('image'), todoController.createTodo);
router.put('/:id', protect, upload.single('image'), todoController.updateTodo);
router.delete('/:id', protect, todoController.deleteTodo);
router.get('/:id', protect, todoController.getTodo);

module.exports = router;