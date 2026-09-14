-- Esquema PostgreSQL para RepairTeach
-- Base de datos esperada por src/db.js: RepairTeach

CREATE TABLE IF NOT EXISTS usuarios (
    id                  BIGSERIAL PRIMARY KEY,
    tipo_documento      VARCHAR(20) NOT NULL,
    documento           VARCHAR(30) NOT NULL UNIQUE,
    nombre_completo     VARCHAR(150) NOT NULL,
    telefono            VARCHAR(20) NOT NULL,
    email               VARCHAR(254) NOT NULL UNIQUE,
    direccion           VARCHAR(255) NOT NULL,
    "contraseña"        TEXT NOT NULL,
    rol                 VARCHAR(20) NOT NULL DEFAULT 'cliente',
    fecha_registro      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT usuarios_rol_check
        CHECK (rol IN ('cliente', 'tecnico', 'admin'))
);

CREATE TABLE IF NOT EXISTS citas (
    id                  BIGSERIAL PRIMARY KEY,
    cliente_id          BIGINT NOT NULL,
    cliente_nombre      VARCHAR(150) NOT NULL,
    cliente_email       VARCHAR(254) NOT NULL,
    cliente_telefono    VARCHAR(20) NOT NULL DEFAULT '',
    cliente_direccion   VARCHAR(255) NOT NULL DEFAULT '',
    tecnico_id          BIGINT,
    tipo_servicio       VARCHAR(100) NOT NULL,
    electrodomestico    VARCHAR(100) NOT NULL,
    marca               VARCHAR(100),
    descripcion         TEXT,
    fecha               DATE NOT NULL,
    hora                VARCHAR(20) NOT NULL,
    estado              VARCHAR(20) NOT NULL DEFAULT 'pendiente',
    fecha_creacion      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT citas_cliente_fk
        FOREIGN KEY (cliente_id) REFERENCES usuarios (id) ON DELETE RESTRICT,
    CONSTRAINT citas_tecnico_fk
        FOREIGN KEY (tecnico_id) REFERENCES usuarios (id) ON DELETE SET NULL,
    CONSTRAINT citas_estado_check
        CHECK (estado IN ('pendiente', 'confirmada', 'en_proceso', 'completada', 'cancelada')),
    CONSTRAINT citas_hora_check
        CHECK (hora IN ('09:00 AM', '10:00 AM', '11:00 AM',
                        '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM'))
);

CREATE INDEX IF NOT EXISTS idx_usuarios_rol
    ON usuarios (rol);

CREATE INDEX IF NOT EXISTS idx_citas_cliente_fecha
    ON citas (cliente_id, fecha DESC, hora DESC);

CREATE INDEX IF NOT EXISTS idx_citas_tecnico_fecha_estado
    ON citas (tecnico_id, fecha, estado);

CREATE INDEX IF NOT EXISTS idx_citas_fecha_hora_tecnico
    ON citas (fecha, hora, tecnico_id);
