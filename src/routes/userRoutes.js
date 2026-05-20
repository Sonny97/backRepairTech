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

// Middlewares de validación
const validateRegistro = require('../middleware/validateRegistro');
const validateLogin = require('../middleware/validateLogin');
const validateUpdateUsuario = require('../middleware/validateUpdateUsuario');
const validateId = require('../middleware/validateId');
const validateCitaEstado = require('../middleware/validateCitaEstado');

const router = express.Router();

// Rutas de usuarios
router.post('/registro', validateRegistro, registrarUsuario);
router.post('/login', validateLogin, loginUsuario);
router.get('/', getUsuarios);
router.get('/:id', validateId('id'), getUsuarioById);  
router.put('/:id', validateId('id'), validateUpdateUsuario, updateUsuario);
router.delete('/:id', validateId('id'), deleteUsuario);

// Rutas de citas para técnico
router.get('/citas/tecnico/:tecnicoId', validateId('tecnicoId'), getCitasByTecnico);
router.get('/citas/tecnico/:tecnicoId/estadisticas', validateId('tecnicoId'), getEstadisticasTecnico);
router.put('/citas/:id/estado', validateId('id'), validateCitaEstado, updateCitaEstado);
router.get('/citas/cliente/:clienteId', validateId('clienteId'), getCitasByCliente);

module.exports = router;