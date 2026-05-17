const express = require('express');
const { 
  registrarUsuario, 
  loginUsuario, 
  getUsuarios,
  getUsuarioById,
  updateUsuario, 
  deleteUsuario,
  getCitasByTecnico,
  getEstadisticasTecnico,
  updateCitaEstado,
  getCitasByCliente
} = require('../controllers/userController');
const validateRegistro = require('../middleware/validateRegistro');
const validateUpdateUsuario = require('../middleware/validateUpdateUsuario');

const router = express.Router();

// Rutas de usuarios
router.post('/registro', validateRegistro, registrarUsuario);
router.post('/login', loginUsuario);
router.get('/', getUsuarios);
router.get('/:id', getUsuarioById);  
router.put('/:id', validateUpdateUsuario, updateUsuario);
router.delete('/:id', deleteUsuario);

// Rutas de citas para técnico
router.get('/citas/tecnico/:tecnicoId', getCitasByTecnico);
router.get('/citas/tecnico/:tecnicoId/estadisticas', getEstadisticasTecnico);
router.put('/citas/:id/estado', updateCitaEstado);
router.get('/citas/cliente/:clienteId', getCitasByCliente);

module.exports = router;