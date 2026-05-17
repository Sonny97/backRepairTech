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

// =============================================
// RUTAS DE CITAS
// =============================================

// Obtener técnicos disponibles
router.get('/tecnicos/disponibles', getTecnicosDisponibles);

// Obtener horarios disponibles
router.get('/horarios', getHorariosDisponibles);

// Crear una nueva cita
router.post('/citas', crearCita);

// Obtener citas de un cliente
router.get('/citas/cliente/:clienteId', getCitasByCliente);

// Cancelar una cita
router.put('/citas/:id/cancelar', cancelarCita);

// Obtener todas las citas (para admin)
router.get('/citas', getAllCitas);


router.put('/citas/:id/estado', updateCitaEstado);

module.exports = router;