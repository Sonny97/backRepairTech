module.exports = function validateUpdateUsuario(req, res, next) {
  const { documento, nombre_completo, telefono, email, rol } = req.body;

  if (!documento || !nombre_completo || !telefono || !email || !rol) {
    return res.status(400).json({ message: 'Todos los campos son obligatorios' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: 'Email inválido' });
  }

  next();
}
