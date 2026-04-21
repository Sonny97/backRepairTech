const express = require('express');
const app = express();
const port = process.env.PORT || 3000;
const userRoutes = require('./routes/userRoutes');
const cors = require('cors');
app.use(cors({ origin: 'http://localhost:3002' }));

// Middleware
app.use(express.json());

// Setup Routes
app.use('/', userRoutes);




// Setup Routes
app.use('/', userRoutes);

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

module.exports = app;

module.exports = app;