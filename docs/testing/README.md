# Documentación de Pruebas — RepairTech Backend

Entregable de la materia **Software Testing**. Todas las técnicas se aplicaron sobre el código real del proyecto (Node.js + Express + PostgreSQL).

## Contenido

| Documento | Técnicas |
|-----------|----------|
| [01 — Caja Negra](01-caja-negra.md) | Partición de equivalencia · Análisis de valores límite · Diagrama de transición de estados · Tablas de decisión |
| [02 — Caja Blanca](02-caja-blanca.md) | Diagrama de flujo · CFG · Complejidad ciclomática · Cobertura de sentencia, decisión, caminos · Pruebas de condición |

## Cómo ejecutar las pruebas

```bash
npm install            # instala Jest
npm test               # ejecuta los 123 casos de prueba
npm run test:coverage  # ejecuta y genera el informe de cobertura
```

Informe navegable: `coverage/lcov-report/index.html`

## Resumen de resultados

| Indicador | Valor |
|-----------|-------|
| Casos de prueba ejecutados | **123** (4 suites, 0 fallos) |
| Cobertura de sentencia | **100 %** (93/93) |
| Cobertura de decisión (ramas) | **100 %** (91/91) |
| Cobertura de funciones | **100 %** (8/8) |
| Complejidad ciclomática del algoritmo | **V(G) = 7** |
| Defectos encontrados | **5** (D-01 a D-05) + 3 observaciones |

## Defectos encontrados

| Id | Severidad | Resumen |
|----|-----------|---------|
| **D-01** | Alta | No se puede agendar una cita para **hoy**: `new Date("YYYY-MM-DD")` se interpreta en UTC y se compara contra la medianoche local (UTC−5). |
| **D-02** | Alta | `PUT /api/citas/:id/estado` no valida la **transición**: permite `completada → pendiente` o saltarse pasos del flujo. |
| **D-03** | Media | El registro guarda el email sin normalizar, pero el login consulta con `toLowerCase()`: un usuario registrado con mayúsculas no puede iniciar sesión. |
| **D-04** | Media | Una `password` numérica evade la validación de longitud mínima (`(12345).length` es `undefined`). |
| **D-05** | Media | Un `telefono` numérico lanza `TypeError` y devuelve **500** en lugar de un 400 de validación. |

Detalle, evidencia y recomendación de corrección en [01-caja-negra.md § 1.5](01-caja-negra.md#15-defectos-y-observaciones-encontrados).

## Archivos de prueba

| Archivo | Casos | Alcance |
|---------|-------|---------|
| [tests/citaService.cajablanca.test.js](../../tests/citaService.cajablanca.test.js) | 37 | Caja blanca: sentencia, decisión, caminos, condición |
| [tests/middlewares.cajanegra.test.js](../../tests/middlewares.cajanegra.test.js) | 39 | Caja negra: equivalencia, valores límite, tabla de decisión, estados |
| [tests/validaciones.complementarias.test.js](../../tests/validaciones.complementarias.test.js) | 31 | Registro, creación de cita, ramas restantes |
| [tests/citas.transiciones.test.js](../../tests/citas.transiciones.test.js) | 16 | Transiciones de estado sobre los controladores, con la base de datos simulada |

## Módulo bajo prueba (caja blanca)

[src/services/citaService.js](../../src/services/citaService.js) — función `evaluarSolicitudCita()`, extraída del requisito funcional **RF-05** (evaluación y priorización de solicitudes de cita). Contiene **6 sentencias de decisión** y los nodos del CFG marcados como `[Nx]` en los comentarios.
