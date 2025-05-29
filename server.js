// ===== UPDATED FILE: ./server.js =====

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initializeGoogleApis } = require('./config/googleApi');
const { initializeAdminUser } = require('./controllers/authController');
const router = require('./routes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api', router);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something broke!' });
});

initializeGoogleApis()
  .then(() => {
    console.log('Google APIs initialized successfully');
    // Initialize admin user after Google APIs are ready
    return initializeAdminUser();
  })
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch(error => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });