// =============================================
// PRUEBAS DE TRANSICION DE ESTADOS - nivel controlador
//
// Ejecuta los casos CP-ET01 .. CP-ET13 del diagrama de transicion de estados
// sustituyendo Prisma por un doble de prueba.
//
// Estados: pendiente -> confirmada -> en_proceso -> completada
//          (cualquiera menos completada) -> cancelada
// =============================================

jest.mock('../src/prisma', () => ({
  usuario: {
    findMany: jest.fn()
  },
  cita: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn()
  }
}));

const prisma = require('../src/prisma');
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
  jest.clearAllMocks();
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

// =============================================================
describe('8. TRANSICIONES DE ESTADO DE LA CITA (CP-ET)', () => {

  test('CP-ET01 | E1 crear -> 201 con estado pendiente', async () => {
    prisma.usuario.findMany
      .mockResolvedValueOnce([{ id: BigInt(3), nombre_completo: 'Ana Tecnica', _count: { citasTecnico: 0 } }]);
    prisma.cita.findFirst.mockResolvedValueOnce(null);
    prisma.cita.create.mockResolvedValueOnce({
      id: BigInt(51),
      estado: 'pendiente',
      hora: '09:00 AM',
      tecnico_id: BigInt(3)
    });

    const res = crearRes();
    await crearCita({ body: CITA_BASE }, res);

    expect(res.statusCode).toBe(201);
    expect(res.body.data.estado).toBe('pendiente');
    expect(res.body.message).toBe('Cita creada exitosamente');
  });

  test('CP-ET01b | E1 sin tecnicos disponibles -> 400', async () => {
    prisma.usuario.findMany.mockResolvedValueOnce([]);

    const res = crearRes();
    await crearCita({ body: CITA_BASE }, res);

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/No hay técnicos disponibles/);
    expect(prisma.cita.create).not.toHaveBeenCalled();
  });

  test.each([
    { id: 'CP-ET02', desde: 'pendiente', evento: 'E2 confirmar', destino: 'confirmada' },
    { id: 'CP-ET03', desde: 'confirmada', evento: 'E3 iniciar', destino: 'en_proceso' },
    { id: 'CP-ET04', desde: 'en_proceso', evento: 'E4 completar', destino: 'completada' }
  ])('$id | $desde + $evento -> 200 con estado $destino', async ({ destino }) => {
    prisma.cita.update.mockResolvedValueOnce({ id: BigInt(51), estado: destino });

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
    prisma.cita.findUnique.mockResolvedValueOnce({ id: BigInt(51), estado: desde });
    prisma.cita.update.mockResolvedValueOnce({});

    const res = crearRes();
    await cancelarCita({ params: { id: '51' } }, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Cita cancelada exitosamente');
    expect(prisma.cita.update).toHaveBeenCalledWith({
      where: { id: BigInt(51) },
      data: { estado: 'cancelada' }
    });
  });

  test('CP-ET07 | completada + E5 cancelar -> 400 y NO se actualiza', async () => {
    prisma.cita.findUnique.mockResolvedValueOnce({ id: BigInt(51), estado: 'completada' });

    const res = crearRes();
    await cancelarCita({ params: { id: '51' } }, res);

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('No se puede cancelar una cita completada');
    expect(prisma.cita.update).not.toHaveBeenCalled();
  });

  test('CP-ET08 | cancelada + E5 cancelar -> 400 y NO se actualiza', async () => {
    prisma.cita.findUnique.mockResolvedValueOnce({ id: BigInt(51), estado: 'cancelada' });

    const res = crearRes();
    await cancelarCita({ params: { id: '51' } }, res);

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('La cita ya está cancelada');
    expect(prisma.cita.update).not.toHaveBeenCalled();
  });

  test('CP-ET08b | cita inexistente + E5 cancelar -> 404', async () => {
    prisma.cita.findUnique.mockResolvedValueOnce(null);

    const res = crearRes();
    await cancelarCita({ params: { id: '999' } }, res);

    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe('Cita no encontrado');
  });

  // ---------------------------------------------------------------
  // DEFECTO D-02: updateCitaEstado ejecuta el UPDATE sin consultar
  // el estado actual, por lo que ninguna transicion invalida se detiene.
  // Estas pruebas documentan el comportamiento actual (defectuoso).
  // ---------------------------------------------------------------
  describe('Transiciones invalidas (DEFECTO D-02)', () => {
    const invalidas = [
      { id: 'CP-ET09', desde: 'completada', destino: 'pendiente' },
      { id: 'CP-ET10', desde: 'cancelada', destino: 'en_proceso' },
      { id: 'CP-ET11', desde: 'pendiente', destino: 'completada' }
    ];

    test.each(invalidas)('$id | $desde -> $destino se acepta con 200 (deberia ser 400)', async ({ destino }) => {
      prisma.cita.update.mockResolvedValueOnce({ id: BigInt(51), estado: destino });

      const res = crearRes();
      await updateCitaEstado({ params: { id: '51' }, body: { estado: destino } }, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.estado).toBe(destino);
    });

    test('CP-ET12 | evidencia: se actualiza sin leer el estado actual', async () => {
      prisma.cita.update.mockResolvedValueOnce({ id: BigInt(51), estado: 'confirmada' });

      const res = crearRes();
      await updateCitaEstado({ params: { id: '51' }, body: { estado: 'confirmada' } }, res);

      // updateCitaEstado solo llama a prisma.cita.update, NO a findUnique primero
      expect(prisma.cita.findUnique).not.toHaveBeenCalled();
      expect(prisma.cita.update).toHaveBeenCalledTimes(1);
    });

    test('CP-ET13 | cita inexistente + cambio de estado -> 404', async () => {
      const error = new Error('Record not found');
      error.code = 'P2025';
      prisma.cita.update.mockRejectedValueOnce(error);

      const res = crearRes();
      await updateCitaEstado({ params: { id: '999' }, body: { estado: 'confirmada' } }, res);

      expect(res.statusCode).toBe(404);
      expect(res.body.message).toBe('Cita no encontrado');
    });
  });
});
