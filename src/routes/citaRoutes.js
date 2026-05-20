const express = require('express');
const router = express.Router();
const {
  getTecnicosDisponibles,
  getHorariosDisponibles,
  crearCita,
  getCitasByCliente,
  cancelarCita,
  getAllCitas,
  updateCitaEstado
} = require('../controllers/citaController');

// Middlewares de validación
const validateCrearCita = require('../middleware/validateCrearCita');
const validateCitaEstado = require('../middleware/validateCitaEstado');
const validateId = require('../middleware/validateId');

// =============================================
// RUTAS DE CITAS
// =============================================

// Obtener técnicos disponibles
router.get('/tecnicos/disponibles', getTecnicosDisponibles);

// Obtener horarios disponibles
router.get('/horarios', getHorariosDisponibles);

// Crear una nueva cita
router.post('/citas', validateCrearCita, crearCita);

// Obtener citas de un cliente
router.get('/citas/cliente/:clienteId', validateId('clienteId'), getCitasByCliente);

// Cancelar una cita
router.put('/citas/:id/cancelar', validateId('id'), cancelarCita);

// Obtener todas las citas (para admin)
router.get('/citas', getAllCitas);

// Actualizar estado de una cita
router.put('/citas/:id/estado', validateId('id'), validateCitaEstado, updateCitaEstado);

module.exports = router;