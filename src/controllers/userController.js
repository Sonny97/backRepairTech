const bcrypt = require('bcryptjs');
const pool = require('../db');
const { 
  successResponse, 
  errorResponse, 
  serverErrorResponse, 
  notFoundResponse, 
  unauthorizedResponse 
} = require('../utils/responseHelper');

const registrarUsuario = async (req, res) => {
  const { docType, docNumber, fullName, phone, email, address, password } = req.body;

  try {
    const usuarioExistente = await pool.query(
      'SELECT * FROM usuarios WHERE email = $1 OR documento = $2',
      [email, docNumber]
    );

    if (usuarioExistente.rows.length > 0) {
      return errorResponse(res, 'El usuario ya existe', 400);
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

    return successResponse(res, result.rows[0], 'Usuario registrado exitosamente', 201);
  } catch (error) {
    return serverErrorResponse(res, error, 'Error al registrar usuario');
  }
};

const loginUsuario = async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await pool.query(
      'SELECT id, email, contraseña, rol, nombre_completo, documento, telefono, direccion FROM usuarios WHERE email = $1',
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return unauthorizedResponse(res, 'Credenciales inválidas');
    }

    const user = result.rows[0];
    const isValidPassword = await bcrypt.compare(password, user.contraseña);

    if (!isValidPassword) {
      return unauthorizedResponse(res, 'Credenciales inválidas');
    }

    delete user.contraseña;

    return successResponse(res, {
      id: user.id,
      email: user.email,
      rol: user.rol,
      nombre_completo: user.nombre_completo,
      documento: user.documento,
      telefono: user.telefono,
      direccion: user.direccion
    }, 'Login exitoso');
  } catch (error) {
    return serverErrorResponse(res, error, 'Error al iniciar sesión');
  }
};

const getUsuarios = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, tipo_documento, documento, nombre_completo, telefono, email, direccion, rol, fecha_registro FROM usuarios ORDER BY id'
    );
    return successResponse(res, result.rows, 'Usuarios obtenidos correctamente');
  } catch (error) {
    return serverErrorResponse(res, error, 'Error al obtener usuarios');
  }
};

const getUsuarioById = async (req, res) => {
  const { id } = req.params;
  
  try {
    const result = await pool.query(
      'SELECT id, tipo_documento, documento, nombre_completo, telefono, email, direccion, rol, fecha_registro FROM usuarios WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return notFoundResponse(res, 'Usuario');
    }
    
    return successResponse(res, result.rows[0], 'Usuario obtenido correctamente');
  } catch (error) {
    return serverErrorResponse(res, error, 'Error al obtener usuario');
  }
};

const updateUsuario = async (req, res) => {
  const { id } = req.params;
  const { nombre_completo, telefono, email, direccion } = req.body; 

  try {
    if (email) {
      const emailExistente = await pool.query(
        'SELECT id FROM usuarios WHERE email = $1 AND id != $2',
        [email, id]
      );
      if (emailExistente.rows.length > 0) {
        return errorResponse(res, 'El correo electrónico ya está en uso', 400);
      }
    }

    const result = await pool.query(
      `UPDATE usuarios 
       SET nombre_completo = $1, telefono = $2, email = $3, direccion = $4
       WHERE id = $5
       RETURNING id, documento, nombre_completo, telefono, email, rol`,
      [nombre_completo, telefono, email, direccion, id]
    );

    if (result.rows.length === 0) {
      return notFoundResponse(res, 'Usuario');
    }

    return successResponse(res, result.rows[0], 'Usuario actualizado correctamente');
  } catch (error) {
    return serverErrorResponse(res, error, 'Error al actualizar usuario');
  }
};

const deleteUsuario = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query('DELETE FROM usuarios WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return notFoundResponse(res, 'Usuario');
    }

    return successResponse(res, null, 'Usuario eliminado correctamente');
  } catch (error) {
    return serverErrorResponse(res, error, 'Error al eliminar usuario');
  }
};

// =============================================
// NUEVOS ENDPOINTS PARA TÉCNICO
// =============================================

// Obtener citas de un técnico
const getCitasByTecnico = async (req, res) => {
  const { tecnicoId } = req.params;
  
  try {
    const result = await pool.query(
      `SELECT c.*, 
              c.cliente_nombre,
              c.cliente_telefono,
              c.cliente_direccion,
              c.electrodomestico,
              c.marca,
              c.descripcion,
              c.tipo_servicio,
              c.fecha,
              c.hora,
              c.estado
       FROM citas c
       WHERE c.tecnico_id = $1
       ORDER BY c.fecha ASC, c.hora ASC`,
      [tecnicoId]
    );
    return successResponse(res, result.rows, 'Citas del técnico obtenidas correctamente');
  } catch (error) {
    return serverErrorResponse(res, error, 'Error al obtener citas del técnico');
  }
};

// Obtener estadísticas del técnico
const getEstadisticasTecnico = async (req, res) => {
  const { tecnicoId } = req.params;
  
  try {
    const result = await pool.query(
      `SELECT 
        COUNT(CASE WHEN estado = 'pendiente' THEN 1 END) as pendientes,
        COUNT(CASE WHEN estado = 'confirmada' THEN 1 END) as confirmadas,
        COUNT(CASE WHEN estado = 'en_proceso' THEN 1 END) as en_proceso,
        COUNT(CASE WHEN estado = 'completada' THEN 1 END) as completadas,
        COUNT(CASE WHEN estado = 'cancelada' THEN 1 END) as canceladas,
        COUNT(*) as total
       FROM citas
       WHERE tecnico_id = $1`,
      [tecnicoId]
    );
    return successResponse(res, result.rows[0], 'Estadísticas obtenidas correctamente');
  } catch (error) {
    return serverErrorResponse(res, error, 'Error al obtener estadísticas');
  }
};

// Actualizar estado de una cita
const updateCitaEstado = async (req, res) => {
  const { id } = req.params;
  const { estado } = req.body;
  
  // Validación de estado ya realizada por middleware validateCitaEstado
  
  try {
    // Verificar que la cita existe
    const citaExistente = await pool.query(
      'SELECT id, estado FROM citas WHERE id = $1',
      [id]
    );
    
    if (citaExistente.rows.length === 0) {
      return notFoundResponse(res, 'Cita');
    }
    
    const result = await pool.query(
      'UPDATE citas SET estado = $1, fecha_actualizacion = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [estado, id]
    );
    
    return successResponse(res, result.rows[0], 'Estado actualizado correctamente');
  } catch (error) {
    return serverErrorResponse(res, error, 'Error al actualizar estado');
  }
};

// Obtener citas de un cliente (para el técnico)
const getCitasByCliente = async (req, res) => {
  const { clienteId } = req.params;
  
  try {
    const result = await pool.query(
      `SELECT c.*, u.nombre_completo as tecnico_nombre 
       FROM citas c
       LEFT JOIN usuarios u ON c.tecnico_id = u.id
       WHERE c.cliente_id = $1
       ORDER BY c.fecha DESC, c.hora DESC`,
      [clienteId]
    );
    return successResponse(res, result.rows, 'Citas del cliente obtenidas correctamente');
  } catch (error) {
    return serverErrorResponse(res, error, 'Error al obtener citas del cliente');
  }
};

module.exports = { 
  registrarUsuario, 
  loginUsuario, 
  getUsuarios,
  getUsuarioById,  
  updateUsuario,
  deleteUsuario,
  getCitasByTecnico,
  getEstadisticasTecnico,
  updateCitaEstado,
  getCitasByCliente
};