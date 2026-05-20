/**
 * Middleware para validar datos al crear una cita
 */
module.exports = function validateCrearCita(req, res, next) {
  const { 
    tipoServicio, 
    electrodomestico, 
    fecha, 
    clienteId 
  } = req.body;

  const errores = [];

  // Validar campos requeridos
  if (!tipoServicio || tipoServicio.trim() === '') {
    errores.push('El tipo de servicio es obligatorio');
  }

  if (!electrodomestico || electrodomestico.trim() === '') {
    errores.push('El electrodoméstico es obligatorio');
  }

  if (!fecha) {
    errores.push('La fecha es obligatoria');
  } else {
    // Validar formato de fecha
    const fechaDate = new Date(fecha);
    if (isNaN(fechaDate.getTime())) {
      errores.push('Formato de fecha no válido');
    } else {
      // Validar que la fecha no sea pasada
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      if (fechaDate < hoy) {
        errores.push('La fecha no puede ser en el pasado');
      }
    }
  }

  if (!clienteId) {
    errores.push('El ID del cliente es obligatorio');
  } else if (isNaN(Number(clienteId))) {
    errores.push('El ID del cliente debe ser un número válido');
  }

  // Si hay errores, retornar respuesta con todos los errores
  if (errores.length > 0) {
    return res.status(400).json({ 
      message: errores.length === 1 ? errores[0] : 'Errores de validación',
      errores 
    });
  }

  next();
};
