/**
 * Middleware para validar datos de login
 */
module.exports = function validateLogin(req, res, next) {
  const { email, password } = req.body;

  // Validar campos requeridos
  if (!email || !password) {
    return res.status(400).json({ 
      message: 'Email y contraseña son obligatorios' 
    });
  }

  // Validar formato de email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ 
      message: 'Formato de email no válido' 
    });
  }

  // Validar longitud mínima de contraseña
  if (password.length < 6) {
    return res.status(400).json({ 
      message: 'La contraseña debe tener al menos 6 caracteres' 
    });
  }

  next();
};
