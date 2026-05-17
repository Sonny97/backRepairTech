const express = require('express');
const cors = require('cors');
const userRoutes = require('./routes/userRoutes');
const citaRoutes = require('./routes/citaRoutes'); // ← Agrega esta línea

const app = express();
const port = process.env.PORT || 3001;

// CORS
app.use(cors({ origin: 'http://localhost:3002' }));

app.use('/ws', (req, res) => {
  res.status(404).send('WebSocket endpoint not configured');
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  console.log(`📡 ${req.method} ${req.url}`);
  next();
});

app.get('/', (req, res) => {
  res.json({ 
    message: 'API RepairTech funcionando',
    endpoints: {
      registro: 'POST /api/usuarios/registro',
      login: 'POST /api/usuarios/login',
      usuarios: 'GET /api/usuarios',
      citas: 'GET /api/citas',
      crearCita: 'POST /api/citas',
      tecnicos: 'GET /api/tecnicos/disponibles'
    }
  });
});

// Routes
app.use('/api/usuarios', userRoutes);
app.use('/api', citaRoutes); // ← Agrega esta línea (las rutas de citas)

// Iniciar servidor
app.listen(port, () => {
  console.log(`\n🚀 Server running on http://localhost:${port}`);
  console.log(`📋 Endpoints disponibles:`);
  console.log(`   → GET  http://localhost:${port}/`);
  console.log(`   → POST http://localhost:${port}/api/usuarios/registro`);
  console.log(`   → POST http://localhost:${port}/api/usuarios/login`);
  console.log(`   → GET  http://localhost:${port}/api/usuarios`);
  console.log(`   → GET  http://localhost:${port}/api/usuarios/:id`);
  console.log(`   → POST http://localhost:${port}/api/citas`);
  console.log(`   → GET  http://localhost:${port}/api/citas/cliente/:id`);
  console.log(`   → GET  http://localhost:${port}/api/tecnicos/disponibles\n`);
});

module.exports = app;