// =============================================
// PRUEBAS DE TRANSICION DE ESTADOS - nivel controlador
//
// Ejecuta los casos CP-ET01 .. CP-ET11 del diagrama de transicion de estados
// sustituyendo PostgreSQL por un doble de prueba (jest.mock de src/db), de
// modo que ya no quedan casos "pendientes por base de datos".
//
// Estados: pendiente -> confirmada -> en_proceso -> completada
//          (cualquiera menos completada) -> cancelada
// =============================================

jest.mock('../src/db', () => ({ query: jest.fn() }));

const pool = require('../src/db');
const {
  crearCita,
  cancelarCita,
  updateCitaEstado
} = require('../src/controllers/citaController');

// -------- Dobles de prueba de Express --------
function crearRes() {
  const res = { statusCode: null, body: null };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (payload) => { res.body = payload; return res; };
  return res;
}

const CITA_BASE = {
  tipoServicio: 'mantenimiento',
  electrodomestico: 'Lavadora',
  fecha: '2026-12-01',
  clienteId: 7
};

beforeEach(() => {
  pool.query.mockReset();
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

/** Extrae el texto SQL de la llamada n a pool.query */
const sqlDe = (n) => pool.query.mock.calls[n][0].replace(/\s+/g, ' ').trim();

// =============================================================
describe('8. TRANSICIONES DE ESTADO DE LA CITA (CP-ET)', () => {

  test('CP-ET01 | (no existe) + E1 crear -> 201 con estado pendiente', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 3, nombre_completo: 'Ana Tecnica', citas_asignadas: 0 }] })
      .mockResolvedValueOnce({ rows: [] })  // el horario 09:00 AM esta libre
      .mockResolvedValueOnce({ rows: [{ id: 51, estado: 'pendiente', hora: '09:00 AM', tecnico_id: 3 }] });

    const res = crearRes();
    await crearCita({ body: CITA_BASE }, res);

    expect(res.statusCode).toBe(201);
    expect(res.body.data.estado).toBe('pendiente');
    expect(res.body.message).toBe('Cita creada exitosamente');
    // El INSERT fija el estado inicial de forma literal
    expect(sqlDe(2)).toContain("'pendiente'");
  });

  test('CP-ET01b | E1 sin tecnicos disponibles -> 400 (no se crea la cita)', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const res = crearRes();
    await crearCita({ body: CITA_BASE }, res);

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/No hay técnicos disponibles/);
    expect(pool.query).toHaveBeenCalledTimes(1);
  });

  test.each([
    { id: 'CP-ET02', desde: 'pendiente', evento: 'E2 confirmar', destino: 'confirmada' },
    { id: 'CP-ET03', desde: 'confirmada', evento: 'E3 iniciar', destino: 'en_proceso' },
    { id: 'CP-ET04', desde: 'en_proceso', evento: 'E4 completar', destino: 'completada' }
  ])('$id | $desde + $evento -> 200 con estado $destino', async ({ destino }) => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 51, estado: destino }] });

    const res = crearRes();
    await updateCitaEstado({ params: { id: '51' }, body: { estado: destino } }, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.estado).toBe(destino);
    expect(res.body.message).toBe('Estado actualizado correctamente');
  });

  test.each([
    { id: 'CP-ET05', desde: 'pendiente' },
    { id: 'CP-ET06', desde: 'confirmada' },
    { id: 'CP-ET06b', desde: 'en_proceso' }
  ])('$id | $desde + E5 cancelar -> 200 con estado cancelada', async ({ desde }) => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 51, estado: desde }] })  // SELECT del estado actual
      .mockResolvedValueOnce({ rows: [] });                          // UPDATE

    const res = crearRes();
    await cancelarCita({ params: { id: '51' } }, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Cita cancelada exitosamente');
    expect(sqlDe(1)).toContain('UPDATE citas SET estado');
    expect(pool.query.mock.calls[1][1]).toEqual(['cancelada', '51']);
  });

  test('CP-ET07 | completada + E5 cancelar -> 400 y NO se actualiza', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 51, estado: 'completada' }] });

    const res = crearRes();
    await cancelarCita({ params: { id: '51' } }, res);

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('No se puede cancelar una cita completada');
    expect(pool.query).toHaveBeenCalledTimes(1);  // nunca se ejecuto el UPDATE
  });

  test('CP-ET08 | cancelada + E5 cancelar -> 400 y NO se actualiza', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 51, estado: 'cancelada' }] });

    const res = crearRes();
    await cancelarCita({ params: { id: '51' } }, res);

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('La cita ya está cancelada');
    expect(pool.query).toHaveBeenCalledTimes(1);
  });

  test('CP-ET08b | cita inexistente + E5 cancelar -> 404', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const res = crearRes();
    await cancelarCita({ params: { id: '999' } }, res);

    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe('Cita no encontrado');
  });

  // ---------------------------------------------------------------
  // DEFECTO D-02: updateCitaEstado ejecuta el UPDATE sin consultar
  // el estado actual, por lo que ninguna transicion invalida se detiene.
  // Resultado esperado: 400 "transicion no permitida".
  // Estas pruebas documentan el comportamiento actual (defectuoso).
  // ---------------------------------------------------------------
  describe('Transiciones invalidas (DEFECTO D-02)', () => {
    const invalidas = [
      { id: 'CP-ET09', desde: 'completada', destino: 'pendiente' },
      { id: 'CP-ET10', desde: 'cancelada', destino: 'en_proceso' },
      { id: 'CP-ET11', desde: 'pendiente', destino: 'completada' }
    ];

    test.each(invalidas)('$id | $desde -> $destino se acepta con 200 (deberia ser 400)', async ({ destino }) => {
      pool.query.mockResolvedValueOnce({ rows: [{ id: 51, estado: destino }] });

      const res = crearRes();
      await updateCitaEstado({ params: { id: '51' }, body: { estado: destino } }, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.estado).toBe(destino);
    });

    test('CP-ET12 | evidencia: se actualiza sin leer el estado actual', async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ id: 51, estado: 'pendiente' }] });

      const res = crearRes();
      await updateCitaEstado({ params: { id: '51' }, body: { estado: 'pendiente' } }, res);

      // Una sola consulta y es directamente el UPDATE: nunca hay un SELECT previo
      expect(pool.query).toHaveBeenCalledTimes(1);
      expect(sqlDe(0)).toMatch(/^UPDATE citas SET estado/);
      expect(sqlDe(0)).not.toMatch(/SELECT/);
    });

    test('CP-ET13 | cita inexistente + cambio de estado -> 404', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const res = crearRes();
      await updateCitaEstado({ params: { id: '999' }, body: { estado: 'confirmada' } }, res);

      expect(res.statusCode).toBe(404);
      expect(res.body.message).toBe('Cita no encontrado');
    });
  });
});
