const pool = require('../db');

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
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener técnicos:', error);
    res.status(500).json({ error: error.message });
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
      
      return res.json(horariosDisponibles);
    }
    
    res.json(horarios);
  } catch (error) {
    console.error('Error al obtener horarios:', error);
    res.status(500).json({ error: error.message });
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

  // Validar campos requeridos
  if (!tipoServicio || !electrodomestico || !fecha || !clienteId) {
    return res.status(400).json({ 
      error: 'Faltan campos requeridos',
      campos: { tipoServicio, electrodomestico, fecha, clienteId }
    });
  }

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
      return res.status(400).json({ 
        error: 'No hay técnicos disponibles para la fecha seleccionada. Por favor, elige otra fecha.' 
      });
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
      return res.status(400).json({ 
        error: 'No hay horarios disponibles para la fecha seleccionada. Por favor, elige otra fecha.' 
      });
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
    
    res.status(201).json({ 
      success: true, 
      message: 'Cita creada exitosamente', 
      data: result.rows[0] 
    });
  } catch (error) {
    console.error('❌ Error al crear cita:', error);
    res.status(500).json({ error: error.message });
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
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener citas del cliente:', error);
    res.status(500).json({ error: error.message });
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
      return res.status(404).json({ error: 'Cita no encontrada' });
    }
    
    if (cita.rows[0].estado === 'cancelada') {
      return res.status(400).json({ error: 'La cita ya está cancelada' });
    }
    
    if (cita.rows[0].estado === 'completada') {
      return res.status(400).json({ error: 'No se puede cancelar una cita completada' });
    }
    
    await pool.query('UPDATE citas SET estado = $1 WHERE id = $2', ['cancelada', id]);
    res.json({ success: true, message: 'Cita cancelada exitosamente' });
  } catch (error) {
    console.error('Error al cancelar cita:', error);
    res.status(500).json({ error: error.message });
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
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener citas:', error);
    res.status(500).json({ error: error.message });
  }
};

// =============================================
// ACTUALIZAR ESTADO DE UNA CITA (para técnico/admin)
// =============================================
const updateCitaEstado = async (req, res) => {
  const { id } = req.params;
  const { estado } = req.body;
  
  const estadosValidos = ['pendiente', 'confirmada', 'en_proceso', 'completada', 'cancelada'];
  
  if (!estadosValidos.includes(estado)) {
    return res.status(400).json({ error: 'Estado no válido' });
  }
  
  try {
    const result = await pool.query(
      'UPDATE citas SET estado = $1 WHERE id = $2 RETURNING *',
      [estado, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Cita no encontrada' });
    }
    
    res.json({ success: true, message: 'Estado actualizado', data: result.rows[0] });
  } catch (error) {
    console.error('Error al actualizar estado:', error);
    res.status(500).json({ error: error.message });
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