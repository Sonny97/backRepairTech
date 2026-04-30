const bcrypt = require('bcryptjs');
const pool = require('../db');

const registrarUsuario = async (req, res) => {
  const { docType, docNumber, fullName, phone, email, address, password } = req.body;

  try {
    const usuarioExistente = await pool.query(
      'SELECT * FROM usuarios WHERE email = $1 OR documento = $2',
      [email, docNumber]
    );

    if (usuarioExistente.rows.length > 0) {
      return res.status(400).json({ message: 'El usuario ya existe' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const result = await pool.query(
      `INSERT INTO usuarios 
       (tipo_documento, documento, nombre_completo, telefono, email, direccion, contraseña, rol) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'cliente') 
       RETURNING id, email, rol`,
      [docType, docNumber, fullName, phone, email, address, hashedPassword]
    );

    res.status(201).json({
      message: 'Usuario rgmaegistrado exitosamente',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
};

const loginUsuario = async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await pool.query(
      'SELECT id, email, contraseña, rol, nombre_completo, documento FROM usuarios WHERE email = $1',
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    const user = result.rows[0];
    const isValidPassword = await bcrypt.compare(password, user.contraseña);

    if (!isValidPassword) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    delete user.contraseña;

    res.json({
      message: 'Login exitoso',
      user: {
        id: user.id,
        email: user.email,
        rol: user.rol,
        nombre_completo: user.nombre_completo,
        documento: user.documento
      }
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
};

const getUsuarios = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, tipo_documento, documento, nombre_completo, telefono, email, direccion, rol, fecha_registro FROM usuarios ORDER BY id'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
};

const updateUsuario = async (req, res) => {
  const { id } = req.params;
  const { documento, nombre_completo, telefono, email, rol } = req.body;

  try {
    const result = await pool.query(
      `UPDATE usuarios 
       SET documento = $1, nombre_completo = $2, telefono = $3, email = $4, rol = $5
       WHERE id = $6
       RETURNING id, documento, nombre_completo, telefono, email, rol`,
      [documento, nombre_completo, telefono, email, rol, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error al actualizar usuario:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
};

const deleteUsuario = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query('DELETE FROM usuarios WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    res.json({ message: 'Usuario eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar usuario:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
};

module.exports = { 
  registrarUsuario, 
  loginUsuario, 
  getUsuarios,
  updateUsuario,
  deleteUsuario
};