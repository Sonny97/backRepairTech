const bcrypt = require('bcryptjs');
const prisma = require('../prisma');
const {
  successResponse,
  errorResponse,
  serverErrorResponse,
  notFoundResponse,
  unauthorizedResponse
} = require('../utils/responseHelper');

const registrarUsuario = async (req, res) => {
  const { docType, docNumber, fullName, phone, email, address, password, rol } = req.body;

  try {
    const usuarioExistente = await prisma.usuario.findFirst({
      where: {
        OR: [{ email }, { documento: docNumber }]
      }
    });

    if (usuarioExistente) {
      return errorResponse(res, 'El usuario ya existe', 400);
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const rolValido = ['cliente', 'tecnico', 'admin'].includes(rol) ? rol : 'cliente';

    const usuario = await prisma.usuario.create({
      data: {
        tipo_documento: docType,
        documento: docNumber,
        nombre_completo: fullName,
        telefono: phone,
        email,
        direccion: address,
        contrasena: hashedPassword,
        rol: rolValido
      },
      select: {
        id: true,
        email: true,
        rol: true
      }
    });

    return successResponse(res, usuario, 'Usuario registrado exitosamente', 201);
  } catch (error) {
    return serverErrorResponse(res, error, 'Error al registrar usuario');
  }
};

const loginUsuario = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await prisma.usuario.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        email: true,
        contrasena: true,
        rol: true,
        nombre_completo: true,
        documento: true,
        telefono: true,
        direccion: true
      }
    });

    if (!user) {
      return unauthorizedResponse(res, 'Credenciales inválidas');
    }

    const isValidPassword = await bcrypt.compare(password, user.contrasena);

    if (!isValidPassword) {
      return unauthorizedResponse(res, 'Credenciales inválidas');
    }

    const { contrasena, ...userWithoutPassword } = user;

    return successResponse(res, userWithoutPassword, 'Login exitoso');
  } catch (error) {
    return serverErrorResponse(res, error, 'Error al iniciar sesión');
  }
};

const getUsuarios = async (req, res) => {
  try {
    const usuarios = await prisma.usuario.findMany({
      orderBy: { id: 'asc' },
      select: {
        id: true,
        tipo_documento: true,
        documento: true,
        nombre_completo: true,
        telefono: true,
        email: true,
        direccion: true,
        rol: true,
        fecha_registro: true
      }
    });
    return successResponse(res, usuarios, 'Usuarios obtenidos correctamente');
  } catch (error) {
    return serverErrorResponse(res, error, 'Error al obtener usuarios');
  }
};

const getUsuarioById = async (req, res) => {
  const { id } = req.params;

  try {
    const usuario = await prisma.usuario.findUnique({
      where: { id: BigInt(id) },
      select: {
        id: true,
        tipo_documento: true,
        documento: true,
        nombre_completo: true,
        telefono: true,
        email: true,
        direccion: true,
        rol: true,
        fecha_registro: true
      }
    });

    if (!usuario) {
      return notFoundResponse(res, 'Usuario');
    }

    return successResponse(res, usuario, 'Usuario obtenido correctamente');
  } catch (error) {
    return serverErrorResponse(res, error, 'Error al obtener usuario');
  }
};

const updateUsuario = async (req, res) => {
  const { id } = req.params;
  const { nombre_completo, telefono, email, direccion } = req.body;

  try {
    if (email) {
      const emailExistente = await prisma.usuario.findFirst({
        where: {
          email,
          NOT: { id: BigInt(id) }
        }
      });
      if (emailExistente) {
        return errorResponse(res, 'El correo electrónico ya está en uso', 400);
      }
    }

    const usuario = await prisma.usuario.update({
      where: { id: BigInt(id) },
      data: {
        nombre_completo,
        telefono,
        email,
        direccion
      },
      select: {
        id: true,
        documento: true,
        nombre_completo: true,
        telefono: true,
        email: true,
        rol: true
      }
    });

    return successResponse(res, usuario, 'Usuario actualizado correctamente');
  } catch (error) {
    if (error.code === 'P2025') {
      return notFoundResponse(res, 'Usuario');
    }
    return serverErrorResponse(res, error, 'Error al actualizar usuario');
  }
};

const deleteUsuario = async (req, res) => {
  const { id } = req.params;

  try {
    await prisma.usuario.delete({
      where: { id: BigInt(id) }
    });

    return successResponse(res, null, 'Usuario eliminado correctamente');
  } catch (error) {
    if (error.code === 'P2025') {
      return notFoundResponse(res, 'Usuario');
    }
    return serverErrorResponse(res, error, 'Error al eliminar usuario');
  }
};

const getCitasByTecnico = async (req, res) => {
  const { tecnicoId } = req.params;

  try {
    const citas = await prisma.cita.findMany({
      where: { tecnico_id: BigInt(tecnicoId) },
      orderBy: [{ fecha: 'asc' }, { hora: 'asc' }],
      select: {
        id: true,
        cliente_nombre: true,
        cliente_telefono: true,
        cliente_direccion: true,
        electrodomestico: true,
        marca: true,
        descripcion: true,
        tipo_servicio: true,
        fecha: true,
        hora: true,
        estado: true
      }
    });
    return successResponse(res, citas, 'Citas del técnico obtenidas correctamente');
  } catch (error) {
    return serverErrorResponse(res, error, 'Error al obtener citas del técnico');
  }
};

const getEstadisticasTecnico = async (req, res) => {
  const { tecnicoId } = req.params;

  try {
    const estadisticas = await prisma.cita.groupBy({
      by: ['estado'],
      where: { tecnico_id: BigInt(tecnicoId) },
      _count: { estado: true }
    });

    const resultado = {
      pendientes: 0,
      confirmadas: 0,
      en_proceso: 0,
      completadas: 0,
      canceladas: 0,
      total: 0
    };

    estadisticas.forEach(stat => {
      const estado = stat.estado;
      const count = stat._count.estado;
      resultado[estado] = count;
      resultado.total += count;
    });

    return successResponse(res, resultado, 'Estadísticas obtenidas correctamente');
  } catch (error) {
    return serverErrorResponse(res, error, 'Error al obtener estadísticas');
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

    return successResponse(res, resultado, 'Citas del cliente obtenidas correctamente');
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
