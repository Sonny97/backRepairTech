// =============================================
// PRUEBAS DE CAJA BLANCA - evaluarSolicitudCita()
// RF-05: Evaluación y priorización de solicitudes de cita
//
// Decisiones: D1..D6   |   V(G) = 7
// D1: !tipoServicio || !electrodomestico              (C1 || C2)
// D2: diasHastaCita < 0                               (C3)
// D3: tecnicosDisponibles <= 0 || horariosLibres <= 0 (C4 || C5)
// D4: errores.length > 0                              (C6)
// D5: tipoServicio === 'urgente' && diasHastaCita <= 1(C7 && C8)
// D6: esClienteFrecuente                              (C9)
// =============================================

const { evaluarSolicitudCita, CODIGOS_RECHAZO } = require('../src/services/citaService');

// -------- Datos base reutilizables --------
const OK = { tipoServicio: 'mantenimiento', electrodomestico: 'Lavadora', diasHastaCita: 5, esClienteFrecuente: false };
const DISPONIBLE = { tecnicosDisponibles: 2, horariosLibres: 4 };

describe('1. COBERTURA DE SENTENCIA (Statement Coverage) - 3 casos / 100% lineas', () => {

  test('CP-S1: todos los errores -> nodos N1,N2,N3,N4,N5,N6,N7,N8,N9', () => {
    const r = evaluarSolicitudCita(
      { tipoServicio: '', electrodomestico: '', diasHastaCita: -1 },
      { tecnicosDisponibles: 0, horariosLibres: 0 }
    );
    expect(r.aprobada).toBe(false);
    expect(r.prioridad).toBeNull();
    expect(r.errores).toEqual([
      CODIGOS_RECHAZO.DATOS_INCOMPLETOS,
      CODIGOS_RECHAZO.FECHA_PASADA,
      CODIGOS_RECHAZO.SIN_DISPONIBILIDAD
    ]);
  });

  test('CP-S2: urgente para manana -> nodos N10,N11,N14 (prioridad 3)', () => {
    const r = evaluarSolicitudCita(
      { tipoServicio: 'urgente', electrodomestico: 'Nevera', diasHastaCita: 1 },
      DISPONIBLE
    );
    expect(r.aprobada).toBe(true);
    expect(r.prioridad).toBe(3);
  });

  test('CP-S3: cliente frecuente -> nodos N12,N13,N14 (prioridad 2)', () => {
    const r = evaluarSolicitudCita({ ...OK, esClienteFrecuente: true }, DISPONIBLE);
    expect(r.aprobada).toBe(true);
    expect(r.prioridad).toBe(2);
  });
});

describe('2. COBERTURA DE DECISION (Branch Coverage) - 4 casos / 100% ramas', () => {

  test('CP-D1: D1=V, D2=V, D3=V, D4=V', () => {
    const r = evaluarSolicitudCita(
      { tipoServicio: '', electrodomestico: '', diasHastaCita: -1 },
      { tecnicosDisponibles: 0, horariosLibres: 0 }
    );
    expect(r.errores).toHaveLength(3);
  });

  test('CP-D2: D1=F, D2=F, D3=F, D4=F, D5=V', () => {
    const r = evaluarSolicitudCita(
      { tipoServicio: 'urgente', electrodomestico: 'Nevera', diasHastaCita: 0 },
      DISPONIBLE
    );
    expect(r.prioridad).toBe(3);
  });

  test('CP-D3: D5=F, D6=V', () => {
    const r = evaluarSolicitudCita({ ...OK, esClienteFrecuente: true }, DISPONIBLE);
    expect(r.prioridad).toBe(2);
  });

  // Este caso NO es necesario para cobertura de sentencia (la rama falsa de D6
  // no contiene sentencias) pero SI lo es para cobertura de decision.
  test('CP-D4: D5=F, D6=F (prioridad por defecto 1)', () => {
    const r = evaluarSolicitudCita({ ...OK, esClienteFrecuente: false }, DISPONIBLE);
    expect(r.prioridad).toBe(1);
  });
});

describe('3. COBERTURA DE CAMINOS (Path Coverage) - 10 caminos', () => {

  const caminos = [
    { id: 'CP-R1', ruta: '1-2-3-4-5-6-7-8-9-15', d: 'D1=V D2=V D3=V', errores: 3,
      s: { tipoServicio: '', electrodomestico: '', diasHastaCita: -2 },
      c: { tecnicosDisponibles: 0, horariosLibres: 0 } },
    { id: 'CP-R2', ruta: '1-2-3-4-5-6-8-9-15', d: 'D1=V D2=V D3=F', errores: 2,
      s: { tipoServicio: '', electrodomestico: '', diasHastaCita: -1 },
      c: { tecnicosDisponibles: 2, horariosLibres: 4 } },
    { id: 'CP-R3', ruta: '1-2-3-4-6-7-8-9-15', d: 'D1=V D2=F D3=V', errores: 2,
      s: { tipoServicio: '', electrodomestico: 'Nevera', diasHastaCita: 3 },
      c: { tecnicosDisponibles: 0, horariosLibres: 5 } },
    { id: 'CP-R4', ruta: '1-2-3-4-6-8-9-15', d: 'D1=V D2=F D3=F', errores: 1,
      s: { tipoServicio: 'urgente', electrodomestico: '', diasHastaCita: 2 },
      c: { tecnicosDisponibles: 1, horariosLibres: 1 } },
    { id: 'CP-R5', ruta: '1-2-4-5-6-7-8-9-15', d: 'D1=F D2=V D3=V', errores: 2,
      s: { ...OK, diasHastaCita: -5 },
      c: { tecnicosDisponibles: 0, horariosLibres: 0 } },
    { id: 'CP-R6', ruta: '1-2-4-5-6-8-9-15', d: 'D1=F D2=V D3=F', errores: 1,
      s: { ...OK, diasHastaCita: -1 },
      c: { tecnicosDisponibles: 3, horariosLibres: 6 } },
    { id: 'CP-R7', ruta: '1-2-4-6-7-8-9-15', d: 'D1=F D2=F D3=V', errores: 1,
      s: { ...OK, diasHastaCita: 4 },
      c: { tecnicosDisponibles: 2, horariosLibres: 0 } }
  ];

  test.each(caminos)('$id ($d) camino $ruta -> rechazada con $errores error(es)', ({ s, c, errores }) => {
    const r = evaluarSolicitudCita(s, c);
    expect(r.aprobada).toBe(false);
    expect(r.errores).toHaveLength(errores);
  });

  test('CP-R8: camino 1-2-4-6-8-10-11-14-15 (D5=V) -> prioridad 3', () => {
    const r = evaluarSolicitudCita(
      { tipoServicio: 'urgente', electrodomestico: 'Nevera', diasHastaCita: 0 },
      { tecnicosDisponibles: 1, horariosLibres: 2 }
    );
    expect(r).toEqual({ aprobada: true, prioridad: 3, errores: [] });
  });

  test('CP-R9: camino 1-2-4-6-8-10-12-13-14-15 (D5=F, D6=V) -> prioridad 2', () => {
    const r = evaluarSolicitudCita(
      { tipoServicio: 'mantenimiento', electrodomestico: 'Microondas', diasHastaCita: 6, esClienteFrecuente: true },
      { tecnicosDisponibles: 1, horariosLibres: 1 }
    );
    expect(r).toEqual({ aprobada: true, prioridad: 2, errores: [] });
  });

  test('CP-R10: camino 1-2-4-6-8-10-12-14-15 (D5=F, D6=F) -> prioridad 1', () => {
    const r = evaluarSolicitudCita(
      { tipoServicio: 'instalacion', electrodomestico: 'Secadora', diasHastaCita: 10, esClienteFrecuente: false },
      { tecnicosDisponibles: 4, horariosLibres: 7 }
    );
    expect(r).toEqual({ aprobada: true, prioridad: 1, errores: [] });
  });
});

describe('4. PRUEBAS DE CONDICION Y COBERTURA (condicion / decision-condicion / multiple)', () => {

  describe('D1: C1(!tipoServicio) || C2(!electrodomestico)', () => {
    test('CP-COND1: C1=V C2=V -> D1=V', () => {
      expect(evaluarSolicitudCita({ tipoServicio: '', electrodomestico: '', diasHastaCita: 3 }, DISPONIBLE)
        .errores).toContain(CODIGOS_RECHAZO.DATOS_INCOMPLETOS);
    });
    test('CP-COND2: C1=V C2=F -> D1=V (C2 no se evalua por corto circuito)', () => {
      expect(evaluarSolicitudCita({ tipoServicio: '', electrodomestico: 'Nevera', diasHastaCita: 3 }, DISPONIBLE)
        .errores).toContain(CODIGOS_RECHAZO.DATOS_INCOMPLETOS);
    });
    test('CP-COND3: C1=F C2=V -> D1=V', () => {
      expect(evaluarSolicitudCita({ tipoServicio: 'urgente', electrodomestico: undefined, diasHastaCita: 3 }, DISPONIBLE)
        .errores).toContain(CODIGOS_RECHAZO.DATOS_INCOMPLETOS);
    });
    test('CP-COND4: C1=F C2=F -> D1=F', () => {
      expect(evaluarSolicitudCita(OK, DISPONIBLE).aprobada).toBe(true);
    });
  });

  describe('D3: C4(tecnicos<=0) || C5(horarios<=0)', () => {
    test('CP-COND5: C4=V C5=V -> D3=V', () => {
      expect(evaluarSolicitudCita(OK, { tecnicosDisponibles: 0, horariosLibres: 0 })
        .errores).toContain(CODIGOS_RECHAZO.SIN_DISPONIBILIDAD);
    });
    test('CP-COND6: C4=V C5=F -> D3=V', () => {
      expect(evaluarSolicitudCita(OK, { tecnicosDisponibles: 0, horariosLibres: 5 })
        .errores).toContain(CODIGOS_RECHAZO.SIN_DISPONIBILIDAD);
    });
    test('CP-COND7: C4=F C5=V -> D3=V', () => {
      expect(evaluarSolicitudCita(OK, { tecnicosDisponibles: 3, horariosLibres: 0 })
        .errores).toContain(CODIGOS_RECHAZO.SIN_DISPONIBILIDAD);
    });
    test('CP-COND8: C4=F C5=F -> D3=F', () => {
      expect(evaluarSolicitudCita(OK, { tecnicosDisponibles: 3, horariosLibres: 5 }).aprobada).toBe(true);
    });
  });

  describe('D5: C7(tipo === urgente) && C8(dias <= 1)', () => {
    test('CP-COND9: C7=V C8=V -> D5=V (prioridad 3)', () => {
      expect(evaluarSolicitudCita({ tipoServicio: 'urgente', electrodomestico: 'Nevera', diasHastaCita: 1 }, DISPONIBLE)
        .prioridad).toBe(3);
    });
    test('CP-COND10: C7=V C8=F -> D5=F (urgente pero lejano)', () => {
      expect(evaluarSolicitudCita({ tipoServicio: 'urgente', electrodomestico: 'Nevera', diasHastaCita: 2 }, DISPONIBLE)
        .prioridad).toBe(1);
    });
    test('CP-COND11: C7=F C8=V -> D5=F (C8 no se evalua por corto circuito)', () => {
      expect(evaluarSolicitudCita({ tipoServicio: 'mantenimiento', electrodomestico: 'Nevera', diasHastaCita: 0 }, DISPONIBLE)
        .prioridad).toBe(1);
    });
    test('CP-COND12: C7=F C8=F -> D5=F', () => {
      expect(evaluarSolicitudCita({ tipoServicio: 'instalacion', electrodomestico: 'Nevera', diasHastaCita: 8 }, DISPONIBLE)
        .prioridad).toBe(1);
    });
  });

  describe('D2 (C3), D4 (C6) y D6 (C9) - condiciones simples', () => {
    test('CP-COND13: C3=V (dias=-1) -> D2=V', () => {
      expect(evaluarSolicitudCita({ ...OK, diasHastaCita: -1 }, DISPONIBLE)
        .errores).toContain(CODIGOS_RECHAZO.FECHA_PASADA);
    });
    test('CP-COND14: C3=F (dias=0) -> D2=F', () => {
      expect(evaluarSolicitudCita({ ...OK, diasHastaCita: 0 }, DISPONIBLE).aprobada).toBe(true);
    });
    test('CP-COND15: C6=V -> D4=V (rechazo)', () => {
      expect(evaluarSolicitudCita({ ...OK, diasHastaCita: -3 }, DISPONIBLE).aprobada).toBe(false);
    });
    test('CP-COND16: C6=F -> D4=F (continua a priorizacion)', () => {
      expect(evaluarSolicitudCita(OK, DISPONIBLE).aprobada).toBe(true);
    });
    test('CP-COND17: C9=V -> D6=V (prioridad 2)', () => {
      expect(evaluarSolicitudCita({ ...OK, esClienteFrecuente: true }, DISPONIBLE).prioridad).toBe(2);
    });
    test('CP-COND18: C9=F -> D6=F (prioridad 1)', () => {
      expect(evaluarSolicitudCita({ ...OK, esClienteFrecuente: false }, DISPONIBLE).prioridad).toBe(1);
    });
  });
});

describe('5. ROBUSTEZ (cubre las ramas de los parametros por defecto)', () => {

  test('CP-ROB1: llamada sin argumentos -> rechazada por datos incompletos', () => {
    const r = evaluarSolicitudCita();
    expect(r.aprobada).toBe(false);
    expect(r.errores).toEqual([CODIGOS_RECHAZO.DATOS_INCOMPLETOS]);
  });

  test('CP-ROB2: solicitud presente y contexto ausente -> no falla', () => {
    const r = evaluarSolicitudCita(OK);
    expect(r.aprobada).toBe(true);
    expect(r.prioridad).toBe(1);
  });
});
