// API setup
const userRoutes = require('../routes/userRoutes');
const citaRoutes = require('../routes/citaRoutes'); 

const setupApi = (app) => {
  app.use('/api', userRoutes);
};

const setupCitaApi = (app) => {
  app.use('/citas', citaRoutes);
}

module.exports = { setupApi, setupCitaApi };