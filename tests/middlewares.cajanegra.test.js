// =============================================
// PRUEBAS DE CAJA NEGRA - Validacion de datos de entrada
//
// Variable 1: password  -> POST /api/usuarios/login
//             Sentencias: if (!email || !password) ; if (password.length < 6)
// Variable 2: telefono  -> PUT  /api/usuarios/:id
//             Sentencia:  /^\d{7,15}$/.test(telefono.replace(/\s/g, ''))
//
// Tecnicas ejecutadas aqui: Particion de Equivalencia, Analisis de Valores
// Limite, Tabla de Decision y validacion de estados (maquina de estados).
// =============================================

const validateLogin = require('../src/middleware/validateLogin');
const validateUpdateUsuario = require('../src/middleware/validateUpdateUsuario');
const validateCitaEstado = require('../src/middleware/validateCitaEstado');
const validateId = require('../src/middleware/validateId');

// -------- Dobles de prueba de Express --------
function crearRes() {
  const res = { statusCode: null, body: null };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (payload) => { res.body = payload; return res; };
  return res;
}

/** Ejecuta un middleware y devuelve { paso, statusCode, mensaje } */
function ejecutar(middleware, req) {
  const res = crearRes();
  const next = jest.fn();
  middleware(req, res, next);
  return {
    paso: next.mock.calls.length === 1,
    statusCode: res.statusCode,
    mensaje: res.body ? res.body.message : null
  };
}

const EMAIL_OK = 'cliente@repairtech.com';

// =============================================================
describe('1. PARTICION DE EQUIVALENCIA', () => {

  describe('Variable 1: password (login)', () => {
    test('CP-EQ01 | CE1 (ausente/vacia) -> 400 obligatorios', () => {
      const r = ejecutar(validateLogin, { body: { email: EMAIL_OK, password: '' } });
      expect(r.paso).toBe(false);
      expect(r.statusCode).toBe(400);
      expect(r.mensaje).toMatch(/son obligatorios/);
    });

    test('CP-EQ02 | CE2 (1 a 5 caracteres) -> 400 minimo 6', () => {
      const r = ejecutar(validateLogin, { body: { email: EMAIL_OK, password: '12345' } });
      expect(r.statusCode).toBe(400);
      expect(r.mensaje).toMatch(/al menos 6 caracteres/);
    });

    test('CP-EQ03 | CE3 (>= 6 caracteres) -> valida, pasa al controlador', () => {
      const r = ejecutar(validateLogin, { body: { email: EMAIL_OK, password: 'Clave123' } });
      expect(r.paso).toBe(true);
      expect(r.statusCode).toBeNull();
    });
  });

  describe('Variable 2: telefono (actualizar usuario)', () => {
    const base = { nombre_completo: 'Victor Florez', email: EMAIL_OK };

    test('CP-EQ04 | CE4 (ausente/vacio: campo opcional) -> valido', () => {
      const r = ejecutar(validateUpdateUsuario, { body: { ...base, telefono: '' } });
      expect(r.paso).toBe(true);
    });

    test('CP-EQ05 | CE5 (menos de 7 digitos) -> 400', () => {
      const r = ejecutar(validateUpdateUsuario, { body: { ...base, telefono: '123456' } });
      expect(r.statusCode).toBe(400);
      expect(r.mensaje).toMatch(/7-15 digitos|7-15 dígitos/);
    });

    test('CP-EQ06 | CE6 (7 a 15 digitos) -> valido', () => {
      const r = ejecutar(validateUpdateUsuario, { body: { ...base, telefono: '3001234567' } });
      expect(r.paso).toBe(true);
    });

    test('CP-EQ07 | CE7 (mas de 15 digitos) -> 400', () => {
      const r = ejecutar(validateUpdateUsuario, { body: { ...base, telefono: '3001234567890123' } });
      expect(r.statusCode).toBe(400);
    });

    test('CP-EQ08 | CE8 (contiene caracteres no numericos) -> 400', () => {
      const r = ejecutar(validateUpdateUsuario, { body: { ...base, telefono: '300-ABC-4567' } });
      expect(r.statusCode).toBe(400);
    });

    test('CP-EQ09 | CE6 con espacios internos (se normalizan) -> valido', () => {
      const r = ejecutar(validateUpdateUsuario, { body: { ...base, telefono: '300 123 4567' } });
      expect(r.paso).toBe(true);
    });

    // -------------------------------------------------------------
    // DEFECTO D-05: clase de equivalencia "tipo de dato distinto de texto".
    // telefono numerico rompe telefono.trim() -> TypeError -> HTTP 500.
    // Resultado esperado: 400 con mensaje de validacion.
    // -------------------------------------------------------------
    test('CP-EQ11 | CE9 (telefono numerico, no string) -> TypeError (DEFECTO D-05)', () => {
      expect(() => ejecutar(validateUpdateUsuario, { body: { ...base, telefono: 3001234567 } }))
        .toThrow(TypeError);
    });
  });

  // ---------------------------------------------------------------
  // DEFECTO D-04: password numerica. (12345).length es undefined y
  // "undefined < 6" es false, por lo que la regla de longitud minima
  // NO se aplica y la peticion pasa al controlador.
  // Resultado esperado: 400 "La contraseña debe tener al menos 6 caracteres".
  // ---------------------------------------------------------------
  test('CP-EQ10 | CE9 (password numerica de 5 digitos) -> pasa la validacion (DEFECTO D-04)', () => {
    const r = ejecutar(validateLogin, { body: { email: EMAIL_OK, password: 12345 } });
    expect(r.paso).toBe(true);
    expect(r.statusCode).toBeNull();
  });
});

// =============================================================
describe('2. ANALISIS DE VALORES LIMITE', () => {

  describe('Variable 1: password.length (limite en 6)', () => {
    const casos = [
      { id: 'CP-VL01', tipo: 'limite inferior externo', n: 0, esperado: 400 },
      { id: 'CP-VL02', tipo: 'limite - 1', n: 5, esperado: 400 },
      { id: 'CP-VL03', tipo: 'limite (valor frontera)', n: 6, esperado: null },
      { id: 'CP-VL04', tipo: 'limite + 1', n: 7, esperado: null }
    ];

    test.each(casos)('$id | longitud $n ($tipo)', ({ n, esperado }) => {
      const r = ejecutar(validateLogin, { body: { email: EMAIL_OK, password: 'a'.repeat(n) } });
      expect(r.statusCode).toBe(esperado);
      expect(r.paso).toBe(esperado === null);
    });
  });

  describe('Variable 2: cantidad de digitos de telefono (rango 7-15)', () => {
    const base = { nombre_completo: 'Victor Florez', email: EMAIL_OK };
    const casos = [
      { id: 'CP-VL05', tipo: 'inferior - 1', n: 6,  esperado: 400 },
      { id: 'CP-VL06', tipo: 'inferior',     n: 7,  esperado: null },
      { id: 'CP-VL07', tipo: 'inferior + 1', n: 8,  esperado: null },
      { id: 'CP-VL08', tipo: 'superior - 1', n: 14, esperado: null },
      { id: 'CP-VL09', tipo: 'superior',     n: 15, esperado: null },
      { id: 'CP-VL10', tipo: 'superior + 1', n: 16, esperado: 400 }
    ];

    test.each(casos)('$id | $n digitos ($tipo)', ({ n, esperado }) => {
      const r = ejecutar(validateUpdateUsuario, { body: { ...base, telefono: '3'.repeat(n) } });
      expect(r.statusCode).toBe(esperado);
      expect(r.paso).toBe(esperado === null);
    });
  });

  describe('Variable de apoyo: id de ruta (entero positivo)', () => {
    const casos = [
      { id: 'CP-VL11', valor: '0',  esperado: 400 },
      { id: 'CP-VL12', valor: '1',  esperado: null },
      { id: 'CP-VL13', valor: '-1', esperado: 400 },
      { id: 'CP-VL14', valor: '1.5', esperado: 400 },
      { id: 'CP-VL15', valor: 'abc', esperado: 400 }
    ];

    test.each(casos)('$id | id = $valor', ({ valor, esperado }) => {
      const r = ejecutar(validateId('id'), { params: { id: valor } });
      expect(r.statusCode).toBe(esperado);
    });
  });
});

// =============================================================
describe('3. TABLA DE DECISION - POST /api/usuarios/login', () => {
  // C1: email presente | C2: password presente
  // C3: email cumple regex | C4: password.length >= 6
  const reglas = [
    { id: 'CP-TD01', regla: 'R1', c: 'C1=F', body: { email: '', password: 'Clave123' },
      status: 400, patron: /obligatorios/ },
    { id: 'CP-TD02', regla: 'R2', c: 'C1=V C2=F', body: { email: EMAIL_OK, password: '' },
      status: 400, patron: /obligatorios/ },
    { id: 'CP-TD03', regla: 'R3', c: 'C1=V C2=V C3=F', body: { email: 'cliente.repairtech.com', password: 'Clave123' },
      status: 400, patron: /email no v/i },
    { id: 'CP-TD04', regla: 'R4', c: 'C1=V C2=V C3=V C4=F', body: { email: EMAIL_OK, password: '12345' },
      status: 400, patron: /al menos 6 caracteres/ },
    { id: 'CP-TD05', regla: 'R5', c: 'C1=V C2=V C3=V C4=V', body: { email: EMAIL_OK, password: 'Clave123' },
      status: null, patron: null }
  ];

  test.each(reglas)('$id | $regla ($c)', ({ body, status, patron }) => {
    const r = ejecutar(validateLogin, { body });
    expect(r.statusCode).toBe(status);
    if (patron) {
      expect(r.mensaje).toMatch(patron);
    } else {
      expect(r.paso).toBe(true);
    }
  });
});

// =============================================================
describe('4. DIAGRAMA DE TRANSICION DE ESTADOS - estado de la cita', () => {
  const ESTADOS_VALIDOS = ['pendiente', 'confirmada', 'en_proceso', 'completada', 'cancelada'];

  test.each(ESTADOS_VALIDOS)('CP-TE-OK | estado destino valido: %s', (estado) => {
    const r = ejecutar(validateCitaEstado, { body: { estado } });
    expect(r.paso).toBe(true);
  });

  test('CP-TE01 | estado ausente -> 400 obligatorio', () => {
    const r = ejecutar(validateCitaEstado, { body: {} });
    expect(r.statusCode).toBe(400);
    expect(r.mensaje).toMatch(/obligatorio/);
  });

  test('CP-TE02 | estado inexistente ("finalizada") -> 400 no valido', () => {
    const r = ejecutar(validateCitaEstado, { body: { estado: 'finalizada' } });
    expect(r.statusCode).toBe(400);
    expect(r.mensaje).toBe('Estado no válido');
  });

  test('CP-TE03 | estado con mayusculas ("Pendiente") -> 400 (comparacion sensible)', () => {
    const r = ejecutar(validateCitaEstado, { body: { estado: 'Pendiente' } });
    expect(r.statusCode).toBe(400);
  });
});
