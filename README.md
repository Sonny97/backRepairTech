# RepairTech — Backend API

**Proyecto PPI — Reparación de electrodomésticos**

- Miguel David Montenegro
- Paula Andrea Rosero Colorado
- Victor Manuel Florez Taborda

---

## Descripción

Backend REST API para el sistema de agendamiento de servicios técnicos de RepairTech. Construido con Node.js + Express + PostgreSQL (Prisma ORM).

**Puerto por defecto:** `http://localhost:3001`

---

## Instalación

```bash
npm install
```

## Ejecutar

```bash
# Desarrollo (con hot-reload)
npm run dev

# Producción
npm start

# Tests
npm test
npm run test:coverage  # con coverage
```

---

## Pruebas (Jest)

| Suite | Casos | Alcance |
|-------|-------|---------|
| `middlewares.cajanegra.test.js` | 39 | Partición equivalencia, valores límite, tabla decisión, estados |
| `citaService.cajablanca.test.js` | 37 | Sentencia, decisión, caminos, condición múltiple |
| `validaciones.complementarias.test.js` | 31 | Registro, creación de cita |
| `citas.transiciones.test.js` | 16 | Transiciones de estado con DB simulada |

**Total: 123 tests — Cobertura 100%**

Documentación en `docs/testing/`:
- [01-caja-negra.md](./docs/testing/01-caja-negra.md)
- [02-caja-blanca.md](./docs/testing/02-caja-blanca.md)

---

## CI/CD — GitHub Actions

### Workflows

| Workflow | Trigger | Descripción |
|----------|---------|-------------|
| `backend-tests.yml` | Push/PR a develop, release/*, master, main | Ejecuta los 123 tests de Jest con coverage |
| `branch-protection.yml` | Push/PR a develop, release/*, master, main | Solo notifica y valida convenciones (no bloquea) |

### Ramas protegidas

Solo se acepta push a través de Pull Requests desde ramas autorizadas:

- `feature/*` — Nuevas funcionalidades
- `feat/*` — Forma corta de feature
- `hotfix/*` — Correcciones urgentes
- `fix/*` — Correcciones de bugs
- `refactor/*` — Refactorización
- `release/*` — Ramas de liberación

Ramas que requieren PR: `main`, `master`, `develop`, `release/*`

---

## Herramientas y versiones

| Herramienta | Versión |
|-------------|---------|
| Node.js | 18+ |
| Express | 4.22.1 |
| Prisma | 5.22.0 |
| Jest | 30.5.1 |
| PostgreSQL | 8.20.0 |
| bcryptjs | 3.0.3 |
