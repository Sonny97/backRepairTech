// API setup
const userRoutes = require('../routes/userRoutes');

const setupApi = (app) => {
  app.use('/api', userRoutes);
};

module.exports = setupApi;