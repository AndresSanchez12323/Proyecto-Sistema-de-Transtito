-- -----------------------------------------------------------------------------
-- Esquema de base de datos: Sistema de Tránsito de Medellín
-- Motor      : PostgreSQL 16+
-- Objetivo   : Resolver relaciones muchos-a-muchos, crear tablas normalizadas,
--              poblar datos de ejemplo y exponer procedimientos almacenados para
--              operaciones CRUD sobre entidades principales.
-- -----------------------------------------------------------------------------

DROP SCHEMA IF EXISTS transito CASCADE;
CREATE SCHEMA transito;
SET search_path TO transito;

-- Tabla de oficinas de tránsito ------------------------------------------------
CREATE TABLE oficina_transito (
    cod_oficina      SMALLINT PRIMARY KEY,
    nombre           VARCHAR(80) NOT NULL
);

-- Zonas geográficas -------------------------------------------------------------
CREATE TABLE zona (
    cod_zona         CHAR(3) PRIMARY KEY,
    sector           VARCHAR(50) NOT NULL
);

-- Puestos de control ------------------------------------------------------------
CREATE TABLE puesto_control (
    cod_puesto       CHAR(3) PRIMARY KEY,
    nombre           VARCHAR(80) NOT NULL,
    cod_zona         CHAR(3) NOT NULL REFERENCES zona(cod_zona) ON UPDATE CASCADE
);

-- Agentes de tránsito -----------------------------------------------------------
CREATE TABLE agente_transito (
    cod_agente       CHAR(3) PRIMARY KEY,
    nombre           VARCHAR(80) NOT NULL,
    cod_puesto_actual CHAR(3) REFERENCES puesto_control(cod_puesto) ON UPDATE CASCADE
);

-- Programación trimestral de vigilancia (resuelve asignación semanal) -----------
CREATE TABLE programacion_puesto (
    id_programacion  BIGSERIAL PRIMARY KEY,
    cod_puesto       CHAR(3) NOT NULL REFERENCES puesto_control(cod_puesto) ON DELETE CASCADE,
    cod_agente       CHAR(3) NOT NULL REFERENCES agente_transito(cod_agente) ON DELETE CASCADE,
    fecha_inicio     DATE NOT NULL,
    fecha_fin        DATE NOT NULL,
    turno            VARCHAR(30) NOT NULL,
    CONSTRAINT ck_programacion_rango_valid CHECK (fecha_fin >= fecha_inicio)
);

-- Normas de tránsito ------------------------------------------------------------
CREATE TABLE norma_transito (
    cod_norma        INTEGER PRIMARY KEY,
    nombre           VARCHAR(120) NOT NULL,
    valor_multa      NUMERIC(12,2) NOT NULL
);

-- Oficinas gubernamentales ------------------------------------------------------
CREATE TABLE vehiculo (
    num_placa        VARCHAR(10) PRIMARY KEY,
    serie_motor      VARCHAR(30) UNIQUE NOT NULL,
    marca            VARCHAR(60) NOT NULL,
    modelo           VARCHAR(60) NOT NULL,
    anio_fabricacion SMALLINT,
    valor_vehiculo   NUMERIC(15,2),
    numero_seguro    VARCHAR(30),
    cod_oficina      SMALLINT NOT NULL REFERENCES oficina_transito(cod_oficina) ON UPDATE CASCADE
);

CREATE TABLE propietario (
    cedula           VARCHAR(15) PRIMARY KEY,
    nombre           VARCHAR(80) NOT NULL,
    direccion        VARCHAR(120) NOT NULL,
    telefono         VARCHAR(20)
);

-- Relación muchos-a-muchos entre vehículos y propietarios ----------------------
CREATE TABLE vehiculo_propietario (
    num_placa        VARCHAR(10) NOT NULL REFERENCES vehiculo(num_placa) ON DELETE CASCADE,
    cedula           VARCHAR(15) NOT NULL REFERENCES propietario(cedula) ON DELETE CASCADE,
    fecha_inicio     DATE DEFAULT CURRENT_DATE,
    es_propietario_principal BOOLEAN DEFAULT FALSE,
    PRIMARY KEY (num_placa, cedula)
);

-- Actuaciones por infracciones --------------------------------------------------
CREATE TABLE infraccion (
    cod_infraccion   INTEGER PRIMARY KEY,
    fecha_infraccion DATE NOT NULL,
    hora_infraccion  TIME NOT NULL,
    num_placa        VARCHAR(10) NOT NULL REFERENCES vehiculo(num_placa) ON DELETE CASCADE,
    cod_agente       CHAR(3) NOT NULL REFERENCES agente_transito(cod_agente) ON UPDATE CASCADE
);

-- Relación muchos-a-muchos entre infracciones y normas -------------------------
CREATE TABLE infraccion_norma (
    cod_infraccion   INTEGER NOT NULL REFERENCES infraccion(cod_infraccion) ON DELETE CASCADE,
    cod_norma        INTEGER NOT NULL REFERENCES norma_transito(cod_norma) ON DELETE CASCADE,
    PRIMARY KEY (cod_infraccion, cod_norma)
);

-- Accidentes y vehículos involucrados ------------------------------------------
CREATE TABLE accidente (
    nro_acta         INTEGER PRIMARY KEY,
    fecha_accidente  DATE NOT NULL,
    hora_accidente   TIME NOT NULL,
    descripcion      TEXT NOT NULL,
    cod_zona         CHAR(3) NOT NULL REFERENCES zona(cod_zona) ON UPDATE CASCADE,
    cod_agente       CHAR(3) NOT NULL REFERENCES agente_transito(cod_agente) ON UPDATE CASCADE
);

CREATE TABLE vehiculo_accidente (
    nro_acta         INTEGER NOT NULL REFERENCES accidente(nro_acta) ON DELETE CASCADE,
    num_placa        VARCHAR(10) NOT NULL REFERENCES vehiculo(num_placa) ON DELETE CASCADE,
    PRIMARY KEY (nro_acta, num_placa)
);

-- Audiencias asociadas a accidentes --------------------------------------------
CREATE TABLE audiencia (
    nro_audiencia    INTEGER PRIMARY KEY,
    fecha_audiencia  DATE NOT NULL,
    nro_acta         INTEGER NOT NULL REFERENCES accidente(nro_acta) ON DELETE CASCADE,
    cedula           VARCHAR(15) NOT NULL REFERENCES propietario(cedula) ON UPDATE CASCADE
);

-- Índices de apoyo --------------------------------------------------------------
CREATE INDEX idx_vehiculo_propietario_fecha ON vehiculo_propietario (fecha_inicio DESC);
CREATE INDEX idx_infraccion_fecha ON infraccion (fecha_infraccion DESC);
CREATE INDEX idx_accidente_fecha ON accidente (fecha_accidente DESC);

-- Vista estadística: accidentes por zona y mes ----------------------------------
CREATE OR REPLACE VIEW vw_accidentes_por_zona_mes AS
SELECT
    a.cod_zona,
    date_trunc('month', a.fecha_accidente) AS mes,
    COUNT(*) AS total_accidentes
FROM accidente a
GROUP BY a.cod_zona, date_trunc('month', a.fecha_accidente)
ORDER BY mes, a.cod_zona;

-- -----------------------------------------------------------------------------
-- Inserción de datos de referencia (derivados del taller)
-- -----------------------------------------------------------------------------
INSERT INTO oficina_transito (cod_oficina, nombre) VALUES
    (20, 'Transito Caribe'),
    (21, 'Transito Envigado'),
    (22, 'Transito Sabaneta'),
    (23, 'Transito Bello'),
    (24, 'Transito Itagüí');

INSERT INTO zona (cod_zona, sector) VALUES
    ('Z60', 'Norte'),
    ('Z61', 'Sur'),
    ('Z62', 'Oriente'),
    ('Z63', 'Occidente'),
    ('Z64', 'Nororiental');

INSERT INTO puesto_control (cod_puesto, nombre, cod_zona) VALUES
    ('P50', 'Cerca Aranjuez', 'Z60'),
    ('P51', 'Estación Alpujarra', 'Z64'),
    ('P52', 'Parque Berrío', 'Z62'),
    ('P53', 'Estación Sur', 'Z60'),
    ('P54', 'Estación Floresta', 'Z64');

INSERT INTO agente_transito (cod_agente, nombre, cod_puesto_actual) VALUES
    ('A40', 'Juan Martín García', 'P50'),
    ('A41', 'Carlos David Posada', 'P52'),
    ('A42', 'Ricardo León Isaza', 'P52'),
    ('A43', 'Santiago Díaz Arias', 'P53'),
    ('A44', 'Luis Fernando González', 'P50');

INSERT INTO programacion_puesto (cod_puesto, cod_agente, fecha_inicio, fecha_fin, turno) VALUES
    ('P50', 'A40', DATE '2001-01-01', DATE '2001-03-31', 'Semana 1 - Diurno'),
    ('P52', 'A41', DATE '2001-01-01', DATE '2001-03-31', 'Semana 1 - Nocturno'),
    ('P52', 'A42', DATE '2001-01-08', DATE '2001-04-01', 'Semana 2 - Diurno'),
    ('P53', 'A43', DATE '2001-01-08', DATE '2001-03-31', 'Semana 2 - Nocturno'),
    ('P50', 'A44', DATE '2001-01-15', DATE '2001-04-07', 'Semana 3 - Mixto');

INSERT INTO norma_transito (cod_norma, nombre, valor_multa) VALUES
    (121, 'Semáforo en rojo', 450000.00),
    (122, 'Alta velocidad (zona urbana)', 520000.00),
    (123, 'Alta velocidad (zona escolar)', 620000.00),
    (124, 'Mal estacionado', 150000.00);

INSERT INTO vehiculo (num_placa, serie_motor, marca, modelo, anio_fabricacion, valor_vehiculo, numero_seguro, cod_oficina) VALUES
    ('KBH-364', 'A1234563', 'Chevrolet', 'Chevrolet 1998', 1998, 8500000,  'SV-124', 20),
    ('TAB-325', 'B1362545', 'Mazda',     'Mazda 1999',     1999, 9000000,  'SV-136', 22),
    ('KLM-425', 'C1253636', 'Chevrolet', 'Chevrolet 2001', 2001, 12000000, 'SV-145', 22),
    ('HLM-325', 'D1253535', 'Renault',   'Renault 1995',   1995, 78000000, 'SV-148', 20),
    ('TLM315',  'E3625427', 'Toyota',    'Toyota 1997',    1997, 120000000,'SV-158', 24);

INSERT INTO propietario (cedula, nombre, direccion, telefono) VALUES
    ('71.518.926', 'Carlos Ramirez Mejia', 'Calle 31 Nro.60-74', '452-28-96'),
    ('21.363.428', 'Cielo Uribe Toro', 'Diagonal 3 Nro. 1-24', '336-41-50'),
    ('98.525.358', 'Andres Mejia Torres', 'Carrera 18 Nro. 36-40', '341-77-11'),
    ('8.369.324',  'Luis Ramirez Florez', 'Transversal 1 Nro. 9S-18', '441-35-75'),
    ('3.125.748',  'Miguel Betancur Arias', 'Calle 18 Nro. 45-36', '266-37-41');

INSERT INTO vehiculo_propietario (num_placa, cedula, fecha_inicio, es_propietario_principal) VALUES
    ('KBH-364', '71.518.926', DATE '1998-05-01', TRUE),
    ('KBH-364', '98.525.358', DATE '1999-01-15', FALSE),
    ('TAB-325', '71.518.926', DATE '1999-08-12', TRUE),
    ('KLM-425', '3.125.748',  DATE '2000-02-05', TRUE),
    ('TLM315',  '8.369.324',  DATE '1997-03-18', TRUE),
    ('HLM-325', '8.369.324',  DATE '1995-07-09', TRUE),
    ('TLM315',  '3.125.748',  DATE '1998-11-23', FALSE);

INSERT INTO infraccion (cod_infraccion, fecha_infraccion, hora_infraccion, num_placa, cod_agente) VALUES
    (10, DATE '2001-05-25', TIME '10:30', 'KBH-364', 'A40'),
    (11, DATE '2002-01-10', TIME '12:00', 'KBH-364', 'A41'),
    (12, DATE '1999-06-14', TIME '21:45', 'KLM-425', 'A44'),
    (13, DATE '2000-09-25', TIME '07:50', 'KBH-364', 'A44'),
    (14, DATE '1998-07-10', TIME '20:48', 'TLM315',  'A40');

INSERT INTO infraccion_norma (cod_infraccion, cod_norma) VALUES
    (10, 121),
    (11, 122),
    (10, 124),
    (12, 123),
    (12, 121),
    (13, 124);

INSERT INTO accidente (nro_acta, fecha_accidente, hora_accidente, descripcion, cod_zona, cod_agente) VALUES
    (30, DATE '2001-01-25', TIME '11:40', 'Falla en frenos', 'Z64', 'A40'),
    (32, DATE '1999-06-25', TIME '22:00', 'Cruce semáforo en rojo', 'Z61', 'A41'),
    (34, DATE '2000-06-30', TIME '19:45', 'Estado de embriaguez', 'Z63', 'A44'),
    (36, DATE '2000-07-10', TIME '09:40', 'Alta velocidad', 'Z63', 'A40'),
    (38, DATE '2001-03-30', TIME '18:20', 'Colisión múltiple leve', 'Z61', 'A41');

INSERT INTO vehiculo_accidente (nro_acta, num_placa) VALUES
    (30, 'KBH-364'),
    (32, 'KBH-364'),
    (34, 'TAB-325'),
    (34, 'HLM-325'),
    (36, 'KLM-425'),
    (30, 'TLM315'),
    (38, 'TLM315');

INSERT INTO audiencia (nro_audiencia, fecha_audiencia, nro_acta, cedula) VALUES
    (1, DATE '2001-04-20', 30, '71.518.926'),
    (2, DATE '2001-04-15', 32, '8.369.324'),
    (3, DATE '2001-04-18', 34, '98.525.358'),
    (4, DATE '2001-04-25', 36, '8.369.324'),
    (5, DATE '2001-04-10', 38, '71.518.926');

-- -----------------------------------------------------------------------------
-- Procedimientos almacenados (PostgreSQL 11+)
-- -----------------------------------------------------------------------------

-- Vehículos --------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE sp_vehiculo_insert (
    p_num_placa        TEXT,
    p_serie_motor      TEXT,
    p_marca            TEXT,
    p_modelo           TEXT,
    p_anio             SMALLINT,
    p_valor            NUMERIC,
    p_numero_seguro    TEXT,
    p_cod_oficina      SMALLINT
)
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO vehiculo (num_placa, serie_motor, marca, modelo, anio_fabricacion, valor_vehiculo, numero_seguro, cod_oficina)
    VALUES (p_num_placa, p_serie_motor, p_marca, p_modelo, p_anio, p_valor, p_numero_seguro, p_cod_oficina);
END;
$$;

CREATE OR REPLACE PROCEDURE sp_vehiculo_update (
    p_num_placa        TEXT,
    p_marca            TEXT,
    p_modelo           TEXT,
    p_anio             SMALLINT,
    p_valor            NUMERIC,
    p_numero_seguro    TEXT,
    p_cod_oficina      SMALLINT
)
LANGUAGE plpgsql
AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM vehiculo WHERE num_placa = p_num_placa) THEN
        RAISE EXCEPTION 'Vehículo % no existe', p_num_placa;
    END IF;

    UPDATE vehiculo
       SET marca = COALESCE(p_marca, marca),
           modelo = COALESCE(p_modelo, modelo),
           anio_fabricacion = COALESCE(p_anio, anio_fabricacion),
           valor_vehiculo = COALESCE(p_valor, valor_vehiculo),
           numero_seguro = COALESCE(p_numero_seguro, numero_seguro),
           cod_oficina = COALESCE(p_cod_oficina, cod_oficina)
     WHERE num_placa = p_num_placa;
END;
$$;

CREATE OR REPLACE PROCEDURE sp_vehiculo_delete (
    p_num_placa TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    DELETE FROM vehiculo WHERE num_placa = p_num_placa;
END;
$$;

CREATE OR REPLACE PROCEDURE sp_vehiculo_consultar (
    IN p_num_placa TEXT,
    INOUT p_result REFCURSOR
)
LANGUAGE plpgsql
AS $$
BEGIN
    OPEN p_result FOR
        SELECT v.num_placa, v.marca, v.modelo, v.anio_fabricacion, v.valor_vehiculo,
               v.numero_seguro, v.cod_oficina, o.nombre AS nombre_oficina
          FROM vehiculo v
          JOIN oficina_transito o USING (cod_oficina)
         WHERE p_num_placa IS NULL OR v.num_placa = p_num_placa
         ORDER BY v.num_placa;
END;
$$;

-- Propietarios -----------------------------------------------------------------
CREATE OR REPLACE PROCEDURE sp_propietario_insert (
    p_cedula    TEXT,
    p_nombre    TEXT,
    p_direccion TEXT,
    p_telefono  TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO propietario (cedula, nombre, direccion, telefono)
    VALUES (p_cedula, p_nombre, p_direccion, p_telefono);
END;
$$;

CREATE OR REPLACE PROCEDURE sp_propietario_update (
    p_cedula    TEXT,
    p_nombre    TEXT,
    p_direccion TEXT,
    p_telefono  TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM propietario WHERE cedula = p_cedula) THEN
        RAISE EXCEPTION 'Propietario % no existe', p_cedula;
    END IF;

    UPDATE propietario
       SET nombre = COALESCE(p_nombre, nombre),
           direccion = COALESCE(p_direccion, direccion),
           telefono = COALESCE(p_telefono, telefono)
     WHERE cedula = p_cedula;
END;
$$;

CREATE OR REPLACE PROCEDURE sp_propietario_delete (
    p_cedula TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    DELETE FROM propietario WHERE cedula = p_cedula;
END;
$$;

CREATE OR REPLACE PROCEDURE sp_propietario_consultar (
    IN p_cedula TEXT,
    INOUT p_result REFCURSOR
)
LANGUAGE plpgsql
AS $$
BEGIN
    OPEN p_result FOR
        SELECT p.cedula, p.nombre, p.direccion, p.telefono
          FROM propietario p
         WHERE p_cedula IS NULL OR p.cedula = p_cedula
         ORDER BY p.nombre;
END;
$$;

-- Infracciones -----------------------------------------------------------------
CREATE OR REPLACE PROCEDURE sp_infraccion_insert (
    p_cod_infraccion   INTEGER,
    p_fecha            DATE,
    p_hora             TIME,
    p_num_placa        TEXT,
    p_cod_agente       CHAR(3)
)
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO infraccion (cod_infraccion, fecha_infraccion, hora_infraccion, num_placa, cod_agente)
    VALUES (p_cod_infraccion, p_fecha, p_hora, p_num_placa, p_cod_agente);
END;
$$;

CREATE OR REPLACE PROCEDURE sp_infraccion_update (
    p_cod_infraccion   INTEGER,
    p_fecha            DATE,
    p_hora             TIME,
    p_cod_agente       CHAR(3)
)
LANGUAGE plpgsql
AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM infraccion WHERE cod_infraccion = p_cod_infraccion) THEN
        RAISE EXCEPTION 'Infracción % no existe', p_cod_infraccion;
    END IF;

    UPDATE infraccion
       SET fecha_infraccion = COALESCE(p_fecha, fecha_infraccion),
           hora_infraccion = COALESCE(p_hora, hora_infraccion),
           cod_agente = COALESCE(p_cod_agente, cod_agente)
     WHERE cod_infraccion = p_cod_infraccion;
END;
$$;

CREATE OR REPLACE PROCEDURE sp_infraccion_delete (
    p_cod_infraccion INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
    DELETE FROM infraccion WHERE cod_infraccion = p_cod_infraccion;
END;
$$;

CREATE OR REPLACE PROCEDURE sp_infraccion_consultar (
    IN p_cod_infraccion INTEGER,
    INOUT p_result REFCURSOR
)
LANGUAGE plpgsql
AS $$
BEGIN
    OPEN p_result FOR
        SELECT i.cod_infraccion, i.fecha_infraccion, i.hora_infraccion,
               i.num_placa, v.marca, v.modelo,
               i.cod_agente, a.nombre AS nombre_agente
          FROM infraccion i
          JOIN vehiculo v ON v.num_placa = i.num_placa
          JOIN agente_transito a ON a.cod_agente = i.cod_agente
         WHERE p_cod_infraccion IS NULL OR i.cod_infraccion = p_cod_infraccion
         ORDER BY i.fecha_infraccion DESC, i.hora_infraccion DESC;
END;
$$;

-- Accidentes -------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE sp_accidente_insert (
    p_nro_acta       INTEGER,
    p_fecha          DATE,
    p_hora           TIME,
    p_descripcion    TEXT,
    p_cod_zona       CHAR(3),
    p_cod_agente     CHAR(3)
)
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO accidente (nro_acta, fecha_accidente, hora_accidente, descripcion, cod_zona, cod_agente)
    VALUES (p_nro_acta, p_fecha, p_hora, p_descripcion, p_cod_zona, p_cod_agente);
END;
$$;

CREATE OR REPLACE PROCEDURE sp_accidente_update (
    p_nro_acta       INTEGER,
    p_fecha          DATE,
    p_hora           TIME,
    p_descripcion    TEXT,
    p_cod_zona       CHAR(3),
    p_cod_agente     CHAR(3)
)
LANGUAGE plpgsql
AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM accidente WHERE nro_acta = p_nro_acta) THEN
        RAISE EXCEPTION 'Accidente % no existe', p_nro_acta;
    END IF;

    UPDATE accidente
       SET fecha_accidente = COALESCE(p_fecha, fecha_accidente),
           hora_accidente = COALESCE(p_hora, hora_accidente),
           descripcion = COALESCE(p_descripcion, descripcion),
           cod_zona = COALESCE(p_cod_zona, cod_zona),
           cod_agente = COALESCE(p_cod_agente, cod_agente)
     WHERE nro_acta = p_nro_acta;
END;
$$;

CREATE OR REPLACE PROCEDURE sp_accidente_delete (
    p_nro_acta INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
    DELETE FROM accidente WHERE nro_acta = p_nro_acta;
END;
$$;

CREATE OR REPLACE PROCEDURE sp_accidente_consultar (
    IN p_nro_acta INTEGER,
    INOUT p_result REFCURSOR
)
LANGUAGE plpgsql
AS $$
BEGIN
    OPEN p_result FOR
        SELECT a.nro_acta, a.fecha_accidente, a.hora_accidente, a.descripcion,
               a.cod_zona, z.sector, a.cod_agente, ag.nombre AS nombre_agente,
               array_agg(va.num_placa ORDER BY va.num_placa) AS vehiculos_involucrados
          FROM accidente a
          JOIN zona z ON z.cod_zona = a.cod_zona
          JOIN agente_transito ag ON ag.cod_agente = a.cod_agente
          LEFT JOIN vehiculo_accidente va ON va.nro_acta = a.nro_acta
         WHERE p_nro_acta IS NULL OR a.nro_acta = p_nro_acta
         GROUP BY a.nro_acta, a.fecha_accidente, a.hora_accidente, a.descripcion,
                  a.cod_zona, z.sector, a.cod_agente, ag.nombre
         ORDER BY a.fecha_accidente DESC, a.hora_accidente DESC;
END;
$$;
