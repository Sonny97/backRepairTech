// =============================================
// PRUEBAS DE CAJA NEGRA (complemento) - Cobertura de sentencia y decision
// de los middlewares de validacion restantes:
//   - validateRegistro      (POST /api/usuarios/registro)
//   - validateCrearCita     (POST /api/citas)
//   - validateUpdateUsuario (ramas faltantes)
//   - validateId            (rama faltante)
//
// Se fija la zona horaria para que las pruebas de fecha sean deterministas.
// =============================================

process.env.TZ = 'America/Bogota';

const validateRegistro = require('../src/middleware/validateRegistro');
const validateCrearCita = require('../src/middleware/validateCrearCita');
const validateUpdateUsuario = require('../src/middleware/validateUpdateUsuario');
const validateId = require('../src/middleware/validateId');

function crearRes() {
  const res = { statusCode: null, body: null };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (payload) => { res.body = payload; return res; };
  return res;
}

function ejecutar(middleware, req) {
  const res = crearRes();
  const next = jest.fn();
  middleware(req, res, next);
  return {
    paso: next.mock.calls.length === 1,
    statusCode: res.statusCode,
    mensaje: res.body ? res.body.message : null,
    errores: res.body ? res.body.errores : null
  };
}

/** Devuelve una fecha 'YYYY-MM-DD' desplazada n dias respecto de hoy (hora local) */
function fechaRelativa(dias) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + dias);
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${dia}`;
}

// =============================================================
describe('5. REGISTRO DE USUARIO - POST /api/usuarios/registro', () => {
  const REGISTRO_OK = {
    docType: 'CC',
    docNumber: '1094123456',
    fullName: 'Victor Florez',
    phone: '3001234567',
    email: 'victor@repairtech.com',
    address: 'Calle 10 # 5-20',
    password: 'Clave123'
  };

  test('CP-RG01 | todos los campos validos -> pasa al controlador', () => {
    expect(ejecutar(validateRegistro, { body: REGISTRO_OK }).paso).toBe(true);
  });

  test.each([
    { id: 'CP-RG02', campo: 'docType' },
    { id: 'CP-RG03', campo: 'docNumber' },
    { id: 'CP-RG04', campo: 'fullName' },
    { id: 'CP-RG05', campo: 'phone' },
    { id: 'CP-RG06', campo: 'email' },
    { id: 'CP-RG07', campo: 'address' },
    { id: 'CP-RG08', campo: 'password' }
  ])('$id | falta $campo -> 400 Todos los campos son obligatorios', ({ campo }) => {
    const body = { ...REGISTRO_OK };
    delete body[campo];
    const r = ejecutar(validateRegistro, { body });
    expect(r.statusCode).toBe(400);
    expect(r.mensaje).toBe('Todos los campos son obligatorios');
  });

  test.each([
    { id: 'CP-RG09', tipo: 'sin arroba', email: 'victorrepairtech.com' },
    { id: 'CP-RG10', tipo: 'sin dominio', email: 'victor@repairtech' },
    { id: 'CP-RG11', tipo: 'con espacio', email: 'victor perez@repairtech.com' },
    { id: 'CP-RG12', tipo: 'doble arroba', email: 'victor@@repairtech.com' }
  ])('$id | email invalido ($tipo) -> 400', ({ email }) => {
    const r = ejecutar(validateRegistro, { body: { ...REGISTRO_OK, email } });
    expect(r.statusCode).toBe(400);
    expect(r.mensaje).toBe('Email NO valido');
  });

  test('CP-RG13 | valor limite: password de 5 caracteres -> 400', () => {
    const r = ejecutar(validateRegistro, { body: { ...REGISTRO_OK, password: '12345' } });
    expect(r.statusCode).toBe(400);
    expect(r.mensaje).toMatch(/al menos 6 caracteres/);
  });

  test('CP-RG14 | valor limite: password de 6 caracteres -> valido', () => {
    expect(ejecutar(validateRegistro, { body: { ...REGISTRO_OK, password: '123456' } }).paso).toBe(true);
  });
});

// =============================================================
describe('6. CREAR CITA - POST /api/citas', () => {
  const CITA_OK = {
    tipoServicio: 'mantenimiento',
    electrodomestico: 'Lavadora',
    fecha: fechaRelativa(3),
    clienteId: 7
  };

  test('CP-CC01 | solicitud valida -> pasa al controlador', () => {
    expect(ejecutar(validateCrearCita, { body: CITA_OK }).paso).toBe(true);
  });

  test('CP-CC02 | tipoServicio vacio (solo espacios) -> 400', () => {
    const r = ejecutar(validateCrearCita, { body: { ...CITA_OK, tipoServicio: '   ' } });
    expect(r.statusCode).toBe(400);
    expect(r.mensaje).toBe('El tipo de servicio es obligatorio');
  });

  test('CP-CC03 | electrodomestico vacio -> 400', () => {
    const r = ejecutar(validateCrearCita, { body: { ...CITA_OK, electrodomestico: '' } });
    expect(r.statusCode).toBe(400);
    expect(r.mensaje).toBe('El electrodoméstico es obligatorio');
  });

  test('CP-CC04 | fecha ausente -> 400', () => {
    const body = { ...CITA_OK };
    delete body.fecha;
    const r = ejecutar(validateCrearCita, { body });
    expect(r.statusCode).toBe(400);
    expect(r.mensaje).toBe('La fecha es obligatoria');
  });

  test('CP-CC05 | fecha con formato invalido -> 400', () => {
    const r = ejecutar(validateCrearCita, { body: { ...CITA_OK, fecha: '31/02/2026' } });
    expect(r.statusCode).toBe(400);
    expect(r.mensaje).toBe('Formato de fecha no válido');
  });

  test('CP-CC06 | valor limite: fecha de ayer -> 400 fecha en el pasado', () => {
    const r = ejecutar(validateCrearCita, { body: { ...CITA_OK, fecha: fechaRelativa(-1) } });
    expect(r.statusCode).toBe(400);
    expect(r.mensaje).toBe('La fecha no puede ser en el pasado');
  });

  test('CP-CC07 | valor limite: fecha de manana -> valido', () => {
    expect(ejecutar(validateCrearCita, { body: { ...CITA_OK, fecha: fechaRelativa(1) } }).paso).toBe(true);
  });

  // ---------------------------------------------------------------
  // DEFECTO D-01 (detectado con Analisis de Valores Limite)
  // 'YYYY-MM-DD' se interpreta como UTC, mientras que "hoy" se calcula en
  // hora local. En zonas con offset negativo (America/Bogota = UTC-5) la
  // fecha de HOY queda 5 horas "antes" de la medianoche local y el sistema
  // la rechaza como pasada. Resultado esperado: deberia ser VALIDA.
  // Esta prueba documenta el comportamiento actual (defectuoso).
  // ---------------------------------------------------------------
  test('CP-CC08 | valor limite: fecha de HOY -> 400 (DEFECTO D-01, deberia ser valida)', () => {
    const r = ejecutar(validateCrearCita, { body: { ...CITA_OK, fecha: fechaRelativa(0) } });
    expect(r.statusCode).toBe(400);
    expect(r.mensaje).toBe('La fecha no puede ser en el pasado');
  });

  test('CP-CC09 | fecha de HOY con hora local explicita -> valido (confirma la causa de D-01)', () => {
    const r = ejecutar(validateCrearCita, { body: { ...CITA_OK, fecha: `${fechaRelativa(0)}T00:00:00` } });
    expect(r.paso).toBe(true);
  });

  test('CP-CC10 | clienteId ausente -> 400', () => {
    const body = { ...CITA_OK };
    delete body.clienteId;
    const r = ejecutar(validateCrearCita, { body });
    expect(r.statusCode).toBe(400);
    expect(r.mensaje).toBe('El ID del cliente es obligatorio');
  });

  test('CP-CC11 | clienteId no numerico -> 400', () => {
    const r = ejecutar(validateCrearCita, { body: { ...CITA_OK, clienteId: 'abc' } });
    expect(r.statusCode).toBe(400);
    expect(r.mensaje).toBe('El ID del cliente debe ser un número válido');
  });

  test('CP-CC12 | varios errores a la vez -> 400 con lista de errores', () => {
    const r = ejecutar(validateCrearCita, { body: { tipoServicio: '', electrodomestico: '', fecha: 'xx', clienteId: '' } });
    expect(r.statusCode).toBe(400);
    expect(r.mensaje).toBe('Errores de validación');
    expect(r.errores).toHaveLength(4);
  });
});

// =============================================================
describe('7. RAMAS FALTANTES (actualizar usuario / validacion de id)', () => {

  test('CP-UP01 | nombre_completo vacio -> 400', () => {
    const r = ejecutar(validateUpdateUsuario, { body: { nombre_completo: '  ', email: 'a@b.com' } });
    expect(r.statusCode).toBe(400);
    expect(r.mensaje).toBe('El nombre completo es obligatorio');
  });

  test('CP-UP02 | email ausente -> 400', () => {
    const r = ejecutar(validateUpdateUsuario, { body: { nombre_completo: 'Victor Florez' } });
    expect(r.statusCode).toBe(400);
    expect(r.mensaje).toBe('El correo electrónico es obligatorio');
  });

  test('CP-UP03 | email con formato invalido -> 400', () => {
    const r = ejecutar(validateUpdateUsuario, { body: { nombre_completo: 'Victor Florez', email: 'victor@correo' } });
    expect(r.statusCode).toBe(400);
    expect(r.mensaje).toBe('El formato del correo electrónico no es válido');
  });

  test('CP-ID01 | parametro id ausente -> 400', () => {
    const r = ejecutar(validateId('clienteId'), { params: {} });
    expect(r.statusCode).toBe(400);
    expect(r.mensaje).toBe('El parámetro clienteId es obligatorio');
  });

  test('CP-ID02 | validateId() sin argumento usa "id" por defecto', () => {
    expect(ejecutar(validateId(), { params: { id: '15' } }).paso).toBe(true);
  });
});
