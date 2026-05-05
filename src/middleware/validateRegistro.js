module.exports = function validateRegistro(req, res, next) {
  const { docType, docNumber, fullName, phone, email, address, password } = req.body;
  if (!docType || !docNumber || !fullName || !phone || !email || !address || !password) {
    return res.status(400).json({ message: 'Todos los campos son obligatorios' });
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: 'Email inválido' });
  }
  if (password.length < 6) {
    return res.status(400).json({ message: 'La contraseña debe tener al menos 6 caracteres' });
  }
  next();
}
