// =============================================
// SERVICIO DE EVALUACIÓN DE SOLICITUDES DE CITA
// RF-05: El sistema debe evaluar una solicitud de cita de reparación,
// validar sus datos y disponibilidad, y asignarle una prioridad de atención.
//
// Este módulo es el algoritmo usado en las pruebas de CAJA BLANCA.
// Cada nodo del Grafo de Flujo de Control (CFG) está marcado como [Nx].
// Decisiones: D1..D6  |  Complejidad ciclomática V(G) = 7
// =============================================

const CODIGOS_RECHAZO = {
  DATOS_INCOMPLETOS: 'El tipo de servicio y el electrodoméstico son obligatorios',
  FECHA_PASADA: 'La fecha no puede ser en el pasado',
  SIN_DISPONIBILIDAD: 'No hay técnicos u horarios disponibles para la fecha seleccionada'
};

/**
 * Evalúa una solicitud de cita y devuelve el resultado de la evaluación.
 *
 * @param {Object} solicitud - Datos enviados por el cliente
 * @param {string} solicitud.tipoServicio      - 'urgente' | 'mantenimiento' | 'instalacion' | ...
 * @param {string} solicitud.electrodomestico  - Nombre del electrodoméstico
 * @param {number} solicitud.diasHastaCita     - Días entre hoy y la fecha pedida (negativo = pasado)
 * @param {boolean} solicitud.esClienteFrecuente
 * @param {Object} contexto - Disponibilidad calculada en base de datos
 * @param {number} contexto.tecnicosDisponibles
 * @param {number} contexto.horariosLibres
 * @returns {{aprobada: boolean, prioridad: number|null, errores: string[]}}
 */
function evaluarSolicitudCita(solicitud = {}, contexto = {}) {
  // [N1] Inicio
  const errores = [];
  let prioridad = 1;

  const { tipoServicio, electrodomestico, diasHastaCita, esClienteFrecuente } = solicitud;
  const { tecnicosDisponibles, horariosLibres } = contexto;

  // [N2] D1: C1 || C2
  if (!tipoServicio || !electrodomestico) {
    // [N3]
    errores.push(CODIGOS_RECHAZO.DATOS_INCOMPLETOS);
  }

  // [N4] D2: C3
  if (diasHastaCita < 0) {
    // [N5]
    errores.push(CODIGOS_RECHAZO.FECHA_PASADA);
  }

  // [N6] D3: C4 || C5
  if (tecnicosDisponibles <= 0 || horariosLibres <= 0) {
    // [N7]
    errores.push(CODIGOS_RECHAZO.SIN_DISPONIBILIDAD);
  }

  // [N8] D4: C6
  if (errores.length > 0) {
    // [N9] Salida por rechazo
    return { aprobada: false, prioridad: null, errores };
  }

  // [N10] D5: C7 && C8
  if (tipoServicio === 'urgente' && diasHastaCita <= 1) {
    // [N11] Prioridad alta
    prioridad = 3;
  } else if (esClienteFrecuente) { // [N12] D6: C9
    // [N13] Prioridad media
    prioridad = 2;
  }
  // (la rama falsa de D6 no tiene sentencias: prioridad conserva el valor 1)

  // [N14] Salida por aprobación
  return { aprobada: true, prioridad, errores };
  // [N15] Fin
}

module.exports = { evaluarSolicitudCita, CODIGOS_RECHAZO };
