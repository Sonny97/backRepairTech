/**
 * Middleware para validar IDs en parámetros de ruta
 * @param {string} paramName - Nombre del parámetro a validar (por defecto 'id')
 */
module.exports = function validateId(paramName = 'id') {
  return (req, res, next) => {
    const id = req.params[paramName];

    if (!id) {
      return res.status(400).json({ 
        message: `El parámetro ${paramName} es obligatorio` 
      });
    }

    const numId = Number(id);
    
    if (isNaN(numId) || numId <= 0 || !Number.isInteger(numId)) {
      return res.status(400).json({ 
        message: `El ${paramName} debe ser un número entero positivo` 
      });
    }

    next();
  };
};
