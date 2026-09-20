const prisma = require('../prisma');
const {
  successResponse,
  errorResponse,
  serverErrorResponse,
  notFoundResponse
} = require('../utils/responseHelper');

const HORARIOS_DISPONIBLES = ['09:00 AM', '10:00 AM', '11:00 AM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM'];

const parseDate = (fechaStr) => {
  if (!fechaStr) return null;
  const [year, month, day] = fechaStr.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const getTecnicosDisponibles = async (req, res) => {
  const { fecha } = req.query;

  try {
    const fechaParsed = parseDate(fecha);
    const tecnicos = await prisma.usuario.findMany({
      where: { rol: 'tecnico' },
      select: {
        id: true,
        nombre_completo: true,
        telefono: true,
        email: true,
        _count: {
          select: {
            citasTecnico: {
              where: {
                fecha: fechaParsed,
                estado: { not: 'cancelada' }
              }
            }
          }
        }
      }
    });

    const resultado = tecnicos.map(t => ({
      id: t.id,
      nombre_completo: t.nombre_completo,
      telefono: t.telefono,
      email: t.email,
      citas_asignadas: t._count.citasTecnico
    }));

    resultado.sort((a, b) => a.citas_asignadas - b.citas_asignadas);

    return successResponse(res, resultado, 'Técnicos disponibles obtenidos');
  } catch (error) {
    return serverErrorResponse(res, error, 'Error al obtener técnicos');
  }
};

const getHorariosDisponibles = async (req, res) => {
  const { fecha } = req.query;

  try {
    if (fecha) {
      const citasOcupadas = await prisma.cita.findMany({
        where: {
          fecha: new Date(fecha),
          estado: { not: 'cancelada' }
        },
        select: { hora: true }
      });

      const horasOcupadas = citasOcupadas.map(c => c.hora);
      const horariosDisponibles = HORARIOS_DISPONIBLES.filter(h => !horasOcupadas.includes(h));

      return successResponse(res, horariosDisponibles, 'Horarios disponibles obtenidos');
    }

    return successResponse(res, HORARIOS_DISPONIBLES, 'Horarios obtenidos');
  } catch (error) {
    return serverErrorResponse(res, error, 'Error al obtener horarios');
  }
};

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

  try {
    const tecnicoDisponible = await prisma.usuario.findMany({
      where: { rol: 'tecnico' },
      select: {
        id: true,
        nombre_completo: true,
        _count: {
          select: {
            citasTecnico: {
              where: {
                fecha: parseDate(fecha),
                estado: { not: 'cancelada' }
              }
            }
          }
        }
      },
      orderBy: {
        citasTecnico: { _count: 'asc' }
      },
      take: 1
    });

    if (tecnicoDisponible.length === 0) {
      return errorResponse(res, 'No hay técnicos disponibles para la fecha seleccionada. Por favor, elige otra fecha.', 400);
    }

    const tecnico = tecnicoDisponible[0];
    const tecnicoId = tecnico.id;
    const tecnicoNombre = tecnico.nombre_completo;

    const fechaDate = parseDate(fecha);
    let horaAsignada = null;

    for (const hora of HORARIOS_DISPONIBLES) {
      const citaExistente = await prisma.cita.findFirst({
        where: {
          fecha: fechaDate,
          hora,
          tecnico_id: tecnicoId,
          estado: { not: 'cancelada' }
        }
      });

      if (!citaExistente) {
        horaAsignada = hora;
        break;
      }
    }

    if (!horaAsignada) {
      return errorResponse(res, 'No hay horarios disponibles para la fecha seleccionada. Por favor, elige otra fecha.', 400);
    }

    const cita = await prisma.cita.create({
      data: {
        cliente_id: BigInt(clienteId),
        cliente_nombre: clienteNombre || 'Cliente',
        cliente_email: clienteEmail || 'email@test.com',
        cliente_telefono: clienteTelefono || '',
        cliente_direccion: clienteDireccion || '',
        tecnico_id: tecnicoId,
        tipo_servicio: tipoServicio,
        electrodomestico,
        marca: marca || null,
        descripcion: descripcion || null,
        fecha: fechaDate,
        hora: horaAsignada,
        estado: 'pendiente'
      }
    });

    console.log(`✅ Cita creada: Técnico asignado: ${tecnicoNombre}, Hora: ${horaAsignada}`);

    return successResponse(res, cita, 'Cita creada exitosamente', 201);
  } catch (error) {
    return serverErrorResponse(res, error, 'Error al crear la cita');
  }
};

const getCitasByCliente = async (req, res) => {
  const { clienteId } = req.params;

  try {
    const citas = await prisma.cita.findMany({
      where: { cliente_id: BigInt(clienteId) },
      orderBy: [{ fecha: 'desc' }, { hora: 'desc' }],
      include: {
        tecnico: {
          select: { nombre_completo: true }
        }
      }
    });

    const resultado = citas.map(cita => ({
      ...cita,
      tecnico_nombre: cita.tecnico?.nombre_completo || null
    }));

    return successResponse(res, resultado, 'Citas del cliente obtenidas');
  } catch (error) {
    return serverErrorResponse(res, error, 'Error al obtener citas del cliente');
  }
};

const cancelarCita = async (req, res) => {
  const { id } = req.params;

  try {
    const cita = await prisma.cita.findUnique({
      where: { id: BigInt(id) }
    });

    if (!cita) {
      return notFoundResponse(res, 'Cita');
    }

    if (cita.estado === 'cancelada') {
      return errorResponse(res, 'La cita ya está cancelada', 400);
    }

    if (cita.estado === 'completada') {
      return errorResponse(res, 'No se puede cancelar una cita completada', 400);
    }

    await prisma.cita.update({
      where: { id: BigInt(id) },
      data: { estado: 'cancelada' }
    });

    return successResponse(res, null, 'Cita cancelada exitosamente');
  } catch (error) {
    return serverErrorResponse(res, error, 'Error al cancelar la cita');
  }
};

const getAllCitas = async (req, res) => {
  try {
    const citas = await prisma.cita.findMany({
      orderBy: [{ fecha: 'desc' }, { hora: 'desc' }],
      include: {
        tecnico: {
          select: { nombre_completo: true }
        }
      }
    });

    const resultado = citas.map(cita => ({
      ...cita,
      tecnico_nombre: cita.tecnico?.nombre_completo || null
    }));

    return successResponse(res, resultado, 'Todas las citas obtenidas');
  } catch (error) {
    return serverErrorResponse(res, error, 'Error al obtener citas');
  }
};

const updateCitaEstado = async (req, res) => {
  const { id } = req.params;
  const { estado } = req.body;

  try {
    const cita = await prisma.cita.update({
      where: { id: BigInt(id) },
      data: { estado }
    });

    return successResponse(res, cita, 'Estado actualizado correctamente');
  } catch (error) {
    if (error.code === 'P2025') {
      return notFoundResponse(res, 'Cita');
    }
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
