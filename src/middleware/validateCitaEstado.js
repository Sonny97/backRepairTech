/**
 * Middleware para validar cambio de estado de una cita
 */
module.exports = function validateCitaEstado(req, res, next) {
  const { estado } = req.body;

  const estadosValidos = ['pendiente', 'confirmada', 'en_proceso', 'completada', 'cancelada'];

  if (!estado) {
    return res.status(400).json({ 
      message: 'El estado es obligatorio' 
    });
  }

  if (!estadosValidos.includes(estado)) {
    return res.status(400).json({ 
      message: 'Estado no válido',
      estadosPermitidos: estadosValidos 
    });
  }

  next();
};
