// =============================================
// HELPER DE RESPUESTAS ESTANDARIZADAS
// FÁCIL DE ELIMINAR - Solo borrar este archivo y revertir imports
// =============================================

/**
 * Respuesta exitosa
 * @param {Object} res - Response de Express
 * @param {any} data - Datos a enviar
 * @param {string} message - Mensaje opcional
 * @param {number} status - Código HTTP (default 200)
 */
const successResponse = (res, data = null, message = 'Operación exitosa', status = 200) => {
  return res.status(status).json({
    success: true,
    isServerError: false,
    status,
    message,
    data
  });
};

/**
 * Respuesta de error del cliente (4xx)
 * @param {Object} res - Response de Express
 * @param {string} message - Mensaje de error
 * @param {number} status - Código HTTP (default 400)
 * @param {any} details - Detalles adicionales opcionales
 */
const errorResponse = (res, message = 'Error en la solicitud', status = 400, details = null) => {
  const response = {
    success: false,
    isServerError: false,
    status,
    message
  };
  
  if (details) {
    response.details = details;
  }
  
  return res.status(status).json(response);
};

/**
 * Respuesta de error del servidor (5xx)
 * @param {Object} res - Response de Express
 * @param {Error} error - Error capturado (para logging)
 * @param {string} message - Mensaje genérico para el cliente
 */
const serverErrorResponse = (res, error = null, message = 'Error interno del servidor') => {
  // Log del error real (solo en servidor)
  if (error) {
    console.error('🔴 Server Error:', error);
  }
  
  return res.status(500).json({
    success: false,
    isServerError: true,
    status: 500,
    message
  });
};

/**
 * Respuesta 404 - No encontrado
 * @param {Object} res - Response de Express
 * @param {string} resource - Nombre del recurso
 */
const notFoundResponse = (res, resource = 'Recurso') => {
  return res.status(404).json({
    success: false,
    isServerError: false,
    status: 404,
    message: `${resource} no encontrado`
  });
};

/**
 * Respuesta 401 - No autorizado
 * @param {Object} res - Response de Express
 * @param {string} message - Mensaje de error
 */
const unauthorizedResponse = (res, message = 'No autorizado') => {
  return res.status(401).json({
    success: false,
    isServerError: false,
    status: 401,
    message
  });
};

/**
 * Respuesta 403 - Prohibido
 * @param {Object} res - Response de Express
 * @param {string} message - Mensaje de error
 */
const forbiddenResponse = (res, message = 'Acceso denegado') => {
  return res.status(403).json({
    success: false,
    isServerError: false,
    status: 403,
    message
  });
};

module.exports = {
  successResponse,
  errorResponse,
  serverErrorResponse,
  notFoundResponse,
  unauthorizedResponse,
  forbiddenResponse
};
