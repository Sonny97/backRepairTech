const pool = require('../db');
const { 
  successResponse, 
  errorResponse, 
  serverErrorResponse, 
  notFoundResponse 
} = require('../utils/responseHelper');

// =============================================
// OBTENER TÉCNICOS DISPONIBLES (con conteo de citas)
// =============================================
const getTecnicosDisponibles = async (req, res) => {
  const { fecha, tipo } = req.query;
  
  try {
    let query = `
      SELECT u.id, u.nombre_completo, u.telefono, u.email, COUNT(c.id) as citas_asignadas
      FROM usuarios u
      LEFT JOIN citas c ON u.id = c.tecnico_id AND c.fecha = $1 AND c.estado != 'cancelada'
      WHERE u.rol = 'tecnico'
      GROUP BY u.id, u.nombre_completo, u.telefono, u.email
      ORDER BY citas_asignadas ASC
    `;
    
    const result = await pool.query(query, [fecha || null]);
    return successResponse(res, result.rows, 'Técnicos disponibles obtenidos');
  } catch (error) {
    return serverErrorResponse(res, error, 'Error al obtener técnicos');
  }
};

// =============================================
// OBTENER HORARIOS DISPONIBLES
// =============================================
const getHorariosDisponibles = async (req, res) => {
  const { fecha, tipo } = req.query;
  
  const horarios = ['09:00 AM', '10:00 AM', '11:00 AM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM'];
  
  try {
    if (fecha) {
      const citasOcupadas = await pool.query(
        'SELECT hora FROM citas WHERE fecha = $1',
        [fecha]
      );
      
      const horasOcupadas = citasOcupadas.rows.map(c => c.hora);
      const horariosDisponibles = horarios.filter(h => !horasOcupadas.includes(h));
      
      return successResponse(res, horariosDisponibles, 'Horarios disponibles obtenidos');
    }
    
    return successResponse(res, horarios, 'Horarios obtenidos');
  } catch (error) {
    return serverErrorResponse(res, error, 'Error al obtener horarios');
  }
};

// =============================================
// CREAR UNA NUEVA CITA (ASIGNACIÓN AUTOMÁTICA)
// =============================================
const crearCita = async (req, res) => {
  console.log('📥 Body recibido:', req.body);
  
  const { 
    tipoServicio, 
    electrodomestico, 
    marca, 
    descripcion, 
    fecha, 
    clienteId, 
    clienteNombre, 
    clienteEmail, 
    clienteTelefono, 
    clienteDireccion 
  } = req.body;

  // Validaciones ya realizadas por middleware validateCrearCita

  try {
    // Buscar un técnico disponible para la fecha (el que tenga menos citas asignadas)
    const tecnicoDisponible = await pool.query(
      `SELECT u.id, u.nombre_completo, COUNT(c.id) as citas_asignadas
       FROM usuarios u
       LEFT JOIN citas c ON u.id = c.tecnico_id AND c.fecha = $1 AND c.estado != 'cancelada'
       WHERE u.rol = 'tecnico'
       GROUP BY u.id, u.nombre_completo
       ORDER BY citas_asignadas ASC
       LIMIT 1`,
      [fecha]
    );

    if (tecnicoDisponible.rows.length === 0) {
      return errorResponse(res, 'No hay técnicos disponibles para la fecha seleccionada. Por favor, elige otra fecha.', 400);
    }

    const tecnicoId = tecnicoDisponible.rows[0].id;
    const tecnicoNombre = tecnicoDisponible.rows[0].nombre_completo;
    
    // Horarios disponibles predefinidos
    const horariosDisponibles = ['09:00 AM', '10:00 AM', '11:00 AM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM'];
    
    // Buscar un horario libre para ese técnico en la fecha
    let horaAsignada = null;
    for (const hora of horariosDisponibles) {
      const citaExistente = await pool.query(
        'SELECT id FROM citas WHERE fecha = $1 AND hora = $2 AND tecnico_id = $3 AND estado != $4',
        [fecha, hora, tecnicoId, 'cancelada']
      );
      if (citaExistente.rows.length === 0) {
        horaAsignada = hora;
        break;
      }
    }

    if (!horaAsignada) {
      return errorResponse(res, 'No hay horarios disponibles para la fecha seleccionada. Por favor, elige otra fecha.', 400);
    }

    // Insertar la cita
    const result = await pool.query(
      `INSERT INTO citas 
       (cliente_id, cliente_nombre, cliente_email, cliente_telefono, cliente_direccion, 
        tecnico_id, tipo_servicio, electrodomestico, marca, descripcion, fecha, hora, estado)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'pendiente')
       RETURNING *`,
      [
        clienteId, 
        clienteNombre || 'Cliente', 
        clienteEmail || 'email@test.com', 
        clienteTelefono || '', 
        clienteDireccion || '', 
        tecnicoId, 
        tipoServicio, 
        electrodomestico, 
        marca || null, 
        descripcion || null, 
        fecha, 
        horaAsignada
      ]
    );
    
    console.log(`✅ Cita creada: Técnico asignado: ${tecnicoNombre}, Hora: ${horaAsignada}`);
    
    return successResponse(res, result.rows[0], 'Cita creada exitosamente', 201);
  } catch (error) {
    return serverErrorResponse(res, error, 'Error al crear la cita');
  }
};

// =============================================
// OBTENER CITAS DE UN CLIENTE
// =============================================
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
    return successResponse(res, result.rows, 'Citas del cliente obtenidas');
  } catch (error) {
    return serverErrorResponse(res, error, 'Error al obtener citas del cliente');
  }
};

// =============================================
// CANCELAR UNA CITA
// =============================================
const cancelarCita = async (req, res) => {
  const { id } = req.params;
  
  try {
    const cita = await pool.query(
      'SELECT id, estado FROM citas WHERE id = $1',
      [id]
    );
    
    if (cita.rows.length === 0) {
      return notFoundResponse(res, 'Cita');
    }
    
    if (cita.rows[0].estado === 'cancelada') {
      return errorResponse(res, 'La cita ya está cancelada', 400);
    }
    
    if (cita.rows[0].estado === 'completada') {
      return errorResponse(res, 'No se puede cancelar una cita completada', 400);
    }
    
    await pool.query('UPDATE citas SET estado = $1 WHERE id = $2', ['cancelada', id]);
    return successResponse(res, null, 'Cita cancelada exitosamente');
  } catch (error) {
    return serverErrorResponse(res, error, 'Error al cancelar la cita');
  }
};

// =============================================
// OBTENER TODAS LAS CITAS (para admin)
// =============================================
const getAllCitas = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.*, 
              u.nombre_completo as tecnico_nombre
       FROM citas c
       LEFT JOIN usuarios u ON c.tecnico_id = u.id
       ORDER BY c.fecha DESC, c.hora DESC`
    );
    return successResponse(res, result.rows, 'Todas las citas obtenidas');
  } catch (error) {
    return serverErrorResponse(res, error, 'Error al obtener citas');
  }
};

// =============================================
// ACTUALIZAR ESTADO DE UNA CITA (para técnico/admin)
// =============================================
const updateCitaEstado = async (req, res) => {
  const { id } = req.params;
  const { estado } = req.body;
  
  // Validación de estado ya realizada por middleware validateCitaEstado
  
  try {
    const result = await pool.query(
      'UPDATE citas SET estado = $1 WHERE id = $2 RETURNING *',
      [estado, id]
    );
    
    if (result.rows.length === 0) {
      return notFoundResponse(res, 'Cita');
    }
    
    return successResponse(res, result.rows[0], 'Estado actualizado correctamente');
  } catch (error) {
    return serverErrorResponse(res, error, 'Error al actualizar estado');
  }
};

module.exports = {
  getTecnicosDisponibles,
  getHorariosDisponibles,
  crearCita,
  getCitasByCliente,
  cancelarCita,
  getAllCitas,
  updateCitaEstado
};