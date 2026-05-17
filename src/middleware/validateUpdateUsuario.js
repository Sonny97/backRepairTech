module.exports = function validateUpdateUsuario(req, res, next) {
  const { nombre_completo, telefono, email } = req.body;

  
  if (!nombre_completo || nombre_completo.trim() === '') {
    return res.status(400).json({ message: 'El nombre completo es obligatorio' });
  }

  if (!email || email.trim() === '') {
    return res.status(400).json({ message: 'El correo electrónico es obligatorio' });
  }

  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: 'El formato del correo electrónico no es válido' });
  }

  
  if (telefono && telefono.trim() !== '') {
    const telefonoRegex = /^\d{7,15}$/;
    if (!telefonoRegex.test(telefono.replace(/\s/g, ''))) {
      return res.status(400).json({ message: 'El teléfono debe contener solo números (7-15 dígitos)' });
    }
  }

  next();
};