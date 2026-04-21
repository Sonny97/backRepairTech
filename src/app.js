const express = require('express');
const app = express();
const port = process.env.PORT || 3000;
const setupApi = require('./api/userApi');

// Middleware
app.use(express.json());

// Setup API
setupApi(app);

// Routes
app.get('/', (req, res) => {
  res.send('Hello World!');
});

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

module.exports = app;