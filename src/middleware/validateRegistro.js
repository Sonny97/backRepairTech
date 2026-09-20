module.exports = function validateRegistro(req, res, next) {
  const { docType, docNumber, fullName, phone, email, address, password, rol } = req.body;
  if (!docType || !docNumber || !fullName || !phone || !email || !address || !password) {
    return res.status(400).json({ message: 'Todos los campos son obligatorios' });
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: 'Email NO valido' });
  }
  if (password.length < 6) {
    return res.status(400).json({ message: 'La contraseña debe tener al menos 6 caracteres' });
  }
  if (rol && !['cliente', 'tecnico', 'admin'].includes(rol)) {
    return res.status(400).json({ message: 'Rol inválido. Valores permitidos: cliente, tecnico, admin' });
  }
  next();
}
