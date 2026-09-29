-- =====================================================================
-- Kairos Digital Systems - Datos de prueba realistas (UMSS, Cochabamba)
-- Basado en carreras reales de la Facultad de Ciencias y Tecnologia (FCyT)
-- de la Universidad Mayor de San Simon, formato real de codigo
-- universitario y correo institucional (@est.umss.edu).
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 1. CARRERAS (reales, Facultad de Ciencias y Tecnologia - UMSS)
-- ---------------------------------------------------------------------
INSERT INTO carreras (codigo, nombre) VALUES
    ('INF', 'Ingenieria Informatica'),
    ('SIS', 'Ingenieria en Sistemas'),
    ('CIV', 'Ingenieria Civil'),
    ('ELT', 'Ingenieria Electrica'),
    ('ELN', 'Ingenieria Electronica'),
    ('ELM', 'Ingenieria Electromecanica'),
    ('IND', 'Ingenieria Industrial'),
    ('MEC', 'Ingenieria Mecanica'),
    ('QUI', 'Ingenieria Quimica'),
    ('ALI', 'Ingenieria en Alimentos')
ON CONFLICT (codigo) DO NOTHING;

-- ---------------------------------------------------------------------
-- 2. MATERIAS (mallas reales de FCyT - UMSS, ciclo basico + carrera)
-- ---------------------------------------------------------------------
INSERT INTO materias (sigla, nombre, carrera_id)
SELECT sigla, nombre, (SELECT id FROM carreras WHERE codigo = car) FROM (VALUES
    -- Ingenieria Informatica
    ('INF100','Introduccion a la Informatica','INF'),
    ('INF119','Programacion I','INF'),
    ('INF211','Programacion II','INF'),
    ('INF220','Estructuras de Datos','INF'),
    ('INF313','Base de Datos I','INF'),
    ('INF322','Sistemas Operativos','INF'),
    ('INF342','Redes de Computadoras','INF'),
    ('INF411','Ingenieria de Software I','INF'),
    ('INF412','Ingenieria de Software II','INF'),
    ('INF432','Inteligencia Artificial','INF'),
    -- Ingenieria en Sistemas
    ('SIS100','Introduccion a los Sistemas de Informacion','SIS'),
    ('SIS119','Programacion I','SIS'),
    ('SIS211','Programacion II','SIS'),
    ('SIS220','Base de Datos I','SIS'),
    ('SIS313','Base de Datos II','SIS'),
    ('SIS322','Analisis y Diseno de Sistemas','SIS'),
    ('SIS342','Ingenieria de Software','SIS'),
    ('SIS411','Auditoria de Sistemas','SIS'),
    -- Ingenieria Civil
    ('CIV100','Algebra I','CIV'),
    ('CIV101','Dibujo Tecnico','CIV'),
    ('CIV102','Calculo I','CIV'),
    ('CIV103','Fisica I','CIV'),
    ('CIV104','Quimica General','CIV'),
    ('CIV200','Geometria Descriptiva','CIV'),
    ('CIV201','Algebra Lineal','CIV'),
    ('CIV202','Calculo II','CIV'),
    ('CIV203','Fisica II','CIV'),
    ('CIV204','Geologia General','CIV'),
    ('CIV310','Resistencia de Materiales','CIV'),
    ('CIV320','Topografia','CIV'),
    -- Ingenieria Electrica
    ('ELT100','Algebra I','ELT'),
    ('ELT102','Calculo I','ELT'),
    ('ELT103','Fisica I','ELT'),
    ('ELT210','Circuitos Electricos I','ELT'),
    ('ELT211','Circuitos Electricos II','ELT'),
    ('ELT320','Maquinas Electricas','ELT'),
    -- Ingenieria Electronica
    ('ELN100','Algebra I','ELN'),
    ('ELN102','Calculo I','ELN'),
    ('ELN103','Fisica I','ELN'),
    ('ELN210','Electronica Analogica','ELN'),
    ('ELN220','Electronica Digital','ELN'),
    ('ELN330','Senales y Sistemas','ELN'),
    -- Ingenieria Electromecanica
    ('ELM100','Algebra I','ELM'),
    ('ELM102','Calculo I','ELM'),
    ('ELM103','Fisica I','ELM'),
    -- Ingenieria Industrial
    ('IND100','Algebra I','IND'),
    ('IND102','Calculo I','IND'),
    ('IND210','Investigacion Operativa I','IND'),
    -- Ingenieria Mecanica
    ('MEC100','Algebra I','MEC'),
    ('MEC102','Calculo I','MEC'),
    ('MEC210','Mecanica de Fluidos','MEC'),
    -- Ingenieria Quimica
    ('QUI100','Algebra I','QUI'),
    ('QUI104','Quimica General','QUI'),
    ('QUI210','Quimica Organica','QUI'),
    -- Ingenieria en Alimentos
    ('ALI100','Algebra I','ALI'),
    ('ALI104','Quimica General','ALI'),
    ('ALI210','Microbiologia de Alimentos','ALI')
) AS t(sigla, nombre, car)
ON CONFLICT (sigla) DO NOTHING;

-- ---------------------------------------------------------------------
-- 3. AMBIENTES (aulas / laboratorios reales del campus FCyT - UMSS)
-- ---------------------------------------------------------------------
INSERT INTO ambientes (nombre, capacidad_maxima, ubicacion) VALUES
    ('Coliseo Politecnico', 300, 'Campus Central UMSS, Calle Jordan, Cochabamba'),
    ('Aula Magna FCyT', 180, 'Campus Central UMSS, Calle Jordan, Cochabamba'),
    ('Modulo 1 - Aula 101', 40, 'Modulo 1, Facultad de Ciencias y Tecnologia, UMSS'),
    ('Modulo 1 - Aula 105', 40, 'Modulo 1, Facultad de Ciencias y Tecnologia, UMSS'),
    ('Modulo 2 - Aula 205', 35, 'Modulo 2, Facultad de Ciencias y Tecnologia, UMSS'),
    ('Modulo 2 - Aula 210', 35, 'Modulo 2, Facultad de Ciencias y Tecnologia, UMSS'),
    ('Modulo 3 - Laboratorio de Sistemas 1', 30, 'Modulo 3, Facultad de Ciencias y Tecnologia, UMSS'),
    ('Modulo 3 - Laboratorio de Sistemas 2', 30, 'Modulo 3, Facultad de Ciencias y Tecnologia, UMSS'),
    ('Modulo 3 - Laboratorio de Redes', 25, 'Modulo 3, Facultad de Ciencias y Tecnologia, UMSS'),
    ('Modulo 4 - Aula 301', 45, 'Modulo 4, Facultad de Ciencias y Tecnologia, UMSS'),
    ('Modulo 4 - Aula 305', 45, 'Modulo 4, Facultad de Ciencias y Tecnologia, UMSS'),
    ('Pabellon Ingenieria Civil - Aula 12', 40, 'Pabellon de Civil, Facultad de Ciencias y Tecnologia, UMSS')
ON CONFLICT (nombre) DO NOTHING;

-- ---------------------------------------------------------------------
-- 4. USUARIOS adicionales (docentes y personal de control de ingreso)
--    Password para todos: Kairos2026!  (hash bcrypt valido)
-- ---------------------------------------------------------------------
INSERT INTO usuarios (nombre_completo, correo_electronico, contrasena_hash, rol_id)
SELECT nombre, correo, '$2b$10$1rRTJO/nYkOn30K2bYm7neos92pRL8vPXkYVvXM6TN1KcNDyz3ZV.', (SELECT id FROM roles WHERE nombre = rol)
FROM (VALUES
    ('Ing. Marco Antonio Rocha Zambrana','marco.rocha@umss.edu','docente'),
    ('Ing. Carla Beatriz Guzman Terrazas','carla.guzman@umss.edu','docente'),
    ('Ing. Ruben Dario Antezana Claros','ruben.antezana@umss.edu','docente'),
    ('Ing. Silvia Patricia Illanes Vargas','silvia.illanes@umss.edu','docente'),
    ('Ing. Jose Luis Peredo Montano','jose.peredo@umss.edu','docente'),
    ('Erika Gonzales Delgadillo','erika.gonzales@kairos.umss.edu','personal de control de ingreso'),
    ('Freddy Vera Salazar','freddy.vera@kairos.umss.edu','personal de control de ingreso'),
    ('Rosario Camacho Aguilar','rosario.camacho@kairos.umss.edu','personal de control de ingreso'),
    ('Directora Academica FCyT','direccion.fcyt@umss.edu','administrador')
) AS t(nombre, correo, rol)
ON CONFLICT (correo_electronico) DO NOTHING;

-- ---------------------------------------------------------------------
-- 5. ESTUDIANTES (60, nombres y apellidos bolivianos comunes;
--    codigo_universitario con el formato real UMSS AAAA+NNNNN;
--    correo_institucional @est.umss.edu)
-- ---------------------------------------------------------------------
INSERT INTO estudiantes (codigo_universitario, documento_identidad, nombre_completo, correo_institucional, carrera_id)
SELECT codigo, ci, nombre, codigo || '@est.umss.edu', (SELECT id FROM carreras WHERE codigo = car)
FROM (VALUES
    ('201945210','5124678 CB','Daniel Alejandro Mamani Quispe','INF'),
    ('202011356','6234891 CB','Fernanda Gabriela Rodriguez Flores','INF'),
    ('202033421','7345902 CB','Sergio Andres Fernandez Rocha','INF'),
    ('202067789','4456713 CB','Valeria Nicole Gutierrez Vargas','INF'),
    ('202111346','8567124 CB','Andy Yerko Blanco Ticona','INF'),
    ('202145678','3678235 CB','Mauricio Gabriel Zambrana Illanes','INF'),
    ('202178932','9789346 CB','Camila Andrea Terrazas Antezana','INF'),
    ('202201245','2890457 CB','Rodrigo Fernando Aguilar Delgadillo','INF'),
    ('202233567','6901568 CB','Paola Jimena Claros Rivero','INF'),
    ('202267890','7012679 CB','Diego Armando Peredo Salazar','INF'),
    ('202145123','5123780 CB','Gabriela Fernanda Gonzales Montano','SIS'),
    ('202178456','8234891 CB','Luis Fernando Camacho Cardozo','SIS'),
    ('202201789','4345902 CB','Andrea Belen Paz Vera','SIS'),
    ('202234012','9456013 CB','Marco Antonio Suarez Montano','SIS'),
    ('202267345','3567124 CB','Lucia Fernanda Quispe Mamani','SIS'),
    ('202111678','7678235 CB','Jose Carlos Flores Rodriguez','SIS'),
    ('202144901','2789346 CB','Mariana Isabel Rocha Fernandez','SIS'),
    ('202178234','6890457 CB','Ricardo Miguel Vargas Gutierrez','SIS'),
    ('202211567','8901568 CB','Claudia Veronica Illanes Zambrana','SIS'),
    ('202244890','3012679 CB','Fernando Jose Antezana Terrazas','SIS'),
    ('201978123','5123457 CB','Juan Pablo Delgadillo Aguilar','CIV'),
    ('202012456','7234568 CB','Ana Maria Rivero Claros','CIV'),
    ('202045789','9345679 CB','Carlos Eduardo Salazar Peredo','CIV'),
    ('202078012','4456780 CB','Daniela Alejandra Montano Gonzales','CIV'),
    ('202111345','6567891 CB','Pablo Sebastian Cardozo Camacho','CIV'),
    ('202144678','8678902 CB','Jimena Andrea Vera Paz','CIV'),
    ('202177901','2789013 CB','Miguel Angel Suarez Rocha','CIV'),
    ('202211234','5890124 CB','Verónica Fernanda Mamani Quispe','CIV'),
    ('202244567','7901235 CB','Andres Felipe Flores Gutierrez','CIV'),
    ('202277890','9012346 CB','Patricia Elena Rodriguez Zambrana','CIV'),
    ('202013123','4123568 CB','Gabriel Ernesto Illanes Terrazas','ELT'),
    ('202046456','6234679 CB','Carla Fernanda Antezana Delgadillo','ELT'),
    ('202079789','8345780 CB','Sergio Daniel Aguilar Claros','ELT'),
    ('202112012','3456891 CB','Maria Jose Rivero Montano','ELT'),
    ('202145345','5567902 CB','Rodrigo Alejandro Salazar Gonzales','ELT'),
    ('202178678','7678013 CB','Andrea Paola Cardozo Vera','ELN'),
    ('202211901','9789124 CB','Diego Armando Suarez Camacho','ELN'),
    ('202245234','2890235 CB','Fernanda Lucia Paz Rocha','ELN'),
    ('202278567','4901346 CB','Jose Luis Mamani Flores','ELN'),
    ('202013890','6012457 CB','Camila Fernanda Quispe Rodriguez','ELN'),
    ('202047123','8123568 CB','Marco Vinicio Gutierrez Vargas','ELM'),
    ('202080456','3234679 CB','Daniela Fernanda Zambrana Illanes','ELM'),
    ('202113789','5345780 CB','Luis Alberto Terrazas Antezana','ELM'),
    ('202147012','7456891 CB','Valeria Camila Aguilar Delgadillo','IND'),
    ('202180345','9567902 CB','Sergio Mauricio Claros Rivero','IND'),
    ('202213678','2678013 CB','Ana Belen Salazar Peredo','IND'),
    ('202246901','4789124 CB','Rodrigo Ernesto Montano Gonzales','MEC'),
    ('202280234','6890235 CB','Fernanda Isabel Cardozo Camacho','MEC'),
    ('202015567','8901346 CB','Carlos Andres Vera Paz','MEC'),
    ('202048890','3012457 CB','Gabriela Andrea Suarez Rocha','QUI'),
    ('202082123','5123568 CB','Jose Miguel Mamani Quispe','QUI'),
    ('202115456','7234679 CB','Lucia Fernanda Flores Gutierrez','QUI'),
    ('202148789','9345780 CB','Andres Sebastian Rodriguez Zambrana','ALI'),
    ('202182012','2456891 CB','Camila Nicole Illanes Terrazas','ALI'),
    ('202215345','4567902 CB','Diego Fernando Antezana Delgadillo','ALI'),
    ('202017678','6678013 CB','Paola Andrea Aguilar Claros','INF'),
    ('202050901','8789124 CB','Miguel Angel Rivero Montano','SIS'),
    ('202084234','3890235 CB','Fernanda Belen Salazar Gonzales','CIV'),
    ('202117567','5901346 CB','Sergio Daniel Cardozo Vera','ELT'),
    ('202150890','7012457 CB','Andrea Camila Suarez Camacho','ELN')
) AS t(codigo, ci, nombre, car)
ON CONFLICT (codigo_universitario) DO NOTHING;

-- ---------------------------------------------------------------------
-- 6. INSCRIPCIONES (gestion 2026-2, cada estudiante en 3 materias
--    de su propia carrera)
-- ---------------------------------------------------------------------
INSERT INTO inscripciones (estudiante_id, materia_id, gestion)
SELECT e.id, m.id, '2026-2'
FROM estudiantes e
JOIN materias m ON m.carrera_id = e.carrera_id
WHERE m.id IN (
    SELECT m2.id FROM materias m2
    WHERE m2.carrera_id = e.carrera_id
    ORDER BY m2.id
    LIMIT 3
)
ON CONFLICT (estudiante_id, materia_id, gestion) DO NOTHING;

-- ---------------------------------------------------------------------
-- 7. MOTIVOS DE INHABILITACION
-- ---------------------------------------------------------------------
INSERT INTO motivos_inhabilitacion (codigo, descripcion) VALUES
    ('DOC_INCOMPLETA', 'Documentacion academica incompleta'),
    ('NO_INSCRITO', 'Estudiante no inscrito en la materia para la gestion actual'),
    ('DEUDA_ECONOMICA', 'Deuda pendiente con la Direccion Administrativa Financiera'),
    ('SANCION_DISCIPLINARIA', 'Sancion disciplinaria vigente emitida por la carrera')
ON CONFLICT (codigo) DO NOTHING;

-- ---------------------------------------------------------------------
-- 8. TIPOS DE INCIDENCIA
-- ---------------------------------------------------------------------
INSERT INTO tipos_incidencia (codigo, descripcion) VALUES
    ('COPIA', 'Intento de copia o uso de material no autorizado'),
    ('SUPLANTACION', 'Sospecha de suplantacion de identidad'),
    ('DISPOSITIVO_ELECTRONICO', 'Uso de dispositivo electronico no autorizado'),
    ('PROBLEMA_SALUD', 'Malestar o emergencia de salud durante el examen'),
    ('ALTERACION_ORDEN', 'Alteracion del orden dentro del ambiente de examen')
ON CONFLICT (codigo) DO NOTHING;

-- ---------------------------------------------------------------------
-- 9. PERMISOS y ROL_PERMISO (matriz basica por rol)
-- ---------------------------------------------------------------------
INSERT INTO permisos (codigo, descripcion) VALUES
    ('EXAMENES_PROGRAMAR', 'Programar examenes (HU-02)'),
    ('EXAMENES_CANCELAR', 'Cancelar examenes (HU-09)'),
    ('ESTUDIANTES_GESTIONAR', 'Registrar y editar estudiantes (HU-01, HU-06, HU-07)'),
    ('AMBIENTES_GESTIONAR', 'Registrar y editar ambientes (HU-03)'),
    ('HABILITACIONES_REGISTRAR', 'Habilitar/inhabilitar estudiantes para un examen (HU-04, HU-05)'),
    ('INGRESOS_REGISTRAR', 'Registrar ingresos a examenes'),
    ('INCIDENCIAS_REGISTRAR', 'Registrar incidencias durante examenes'),
    ('USUARIOS_GESTIONAR', 'Crear y administrar usuarios del sistema (HU-15)'),
    ('REPORTES_VER', 'Consultar reportes y auditoria del sistema')
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO rol_permiso (rol_id, permiso_id)
SELECT r.id, p.id FROM roles r, permisos p WHERE r.nombre = 'administrador'
ON CONFLICT DO NOTHING;

INSERT INTO rol_permiso (rol_id, permiso_id)
SELECT r.id, p.id FROM roles r, permisos p
WHERE r.nombre = 'docente' AND p.codigo IN ('EXAMENES_PROGRAMAR','EXAMENES_CANCELAR','HABILITACIONES_REGISTRAR','REPORTES_VER')
ON CONFLICT DO NOTHING;

INSERT INTO rol_permiso (rol_id, permiso_id)
SELECT r.id, p.id FROM roles r, permisos p
WHERE r.nombre = 'personal de control de ingreso' AND p.codigo IN ('INGRESOS_REGISTRAR','INCIDENCIAS_REGISTRAR')
ON CONFLICT DO NOTHING;

COMMIT;
-- =====================================================================
-- Parte 2: Examenes, habilitaciones, ingresos, incidencias, auditoria
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 10. EXAMENES (gestion 2026-2: pasados, uno en curso hoy, y futuros)
-- ---------------------------------------------------------------------
CREATE TEMP TABLE exam_ids AS
WITH src(materia_sigla, ambiente_nombre, docente_correo, fecha, hora_inicio, duracion_min, estado) AS (
  VALUES
  ('CIV102','Aula Magna FCyT','jose.peredo@umss.edu','2026-08-18'::date,'08:00'::time,120,'finalizado'),
  ('INF119','Modulo 3 - Laboratorio de Sistemas 1','marco.rocha@umss.edu','2026-08-20'::date,'10:00'::time,90,'finalizado'),
  ('ELT103','Coliseo Politecnico','silvia.illanes@umss.edu','2026-08-25'::date,'08:00'::time,120,'finalizado'),
  ('SIS119','Modulo 3 - Laboratorio de Sistemas 2','carla.guzman@umss.edu','2026-09-01'::date,'14:00'::time,90,'finalizado'),
  ('CIV103','Coliseo Politecnico','jose.peredo@umss.edu','2026-09-05'::date,'08:00'::time,120,'finalizado'),
  ('ELN103','Aula Magna FCyT','ruben.antezana@umss.edu','2026-09-08'::date,'10:00'::time,120,'finalizado'),
  ('INF313','Modulo 3 - Laboratorio de Sistemas 1','marco.rocha@umss.edu','2026-09-12'::date,'16:00'::time,90,'finalizado'),
  ('SIS322','Modulo 2 - Aula 205','carla.guzman@umss.edu','2026-09-10'::date,'14:00'::time,90,'cancelado'),
  ('INF342','Modulo 3 - Laboratorio de Redes','marco.rocha@umss.edu','2026-09-22'::date,'10:00'::time,120,'en curso'),
  ('CIV310','Modulo 4 - Aula 301','jose.peredo@umss.edu','2026-09-29'::date,'08:00'::time,120,'programado'),
  ('CIV320','Pabellon Ingenieria Civil - Aula 12','jose.peredo@umss.edu','2026-10-02'::date,'14:00'::time,90,'programado'),
  ('ELT210','Modulo 2 - Aula 210','silvia.illanes@umss.edu','2026-10-06'::date,'08:00'::time,90,'programado'),
  ('ELT320','Modulo 2 - Aula 210','silvia.illanes@umss.edu','2026-10-09'::date,'10:00'::time,120,'programado'),
  ('ELN210','Modulo 3 - Laboratorio de Sistemas 2','ruben.antezana@umss.edu','2026-10-13'::date,'14:00'::time,90,'programado'),
  ('ELN330','Modulo 1 - Aula 101','ruben.antezana@umss.edu','2026-10-16'::date,'16:00'::time,90,'programado'),
  ('ELM102','Modulo 1 - Aula 105','silvia.illanes@umss.edu','2026-10-20'::date,'08:00'::time,120,'programado'),
  ('IND210','Modulo 2 - Aula 205','carla.guzman@umss.edu','2026-10-23'::date,'10:00'::time,90,'programado'),
  ('MEC210','Modulo 4 - Aula 305','jose.peredo@umss.edu','2026-10-27'::date,'14:00'::time,90,'programado'),
  ('QUI210','Modulo 1 - Aula 101','marco.rocha@umss.edu','2026-10-30'::date,'08:00'::time,120,'programado'),
  ('ALI210','Modulo 1 - Aula 105','carla.guzman@umss.edu','2026-11-03'::date,'10:00'::time,90,'programado'),
  ('INF432','Modulo 3 - Laboratorio de Sistemas 1','marco.rocha@umss.edu','2026-11-06'::date,'16:00'::time,90,'programado'),
  ('SIS342','Modulo 3 - Laboratorio de Sistemas 2','carla.guzman@umss.edu','2026-11-10'::date,'14:00'::time,90,'programado')
),
ins AS (
  INSERT INTO examenes (materia_id, ambiente_id, fecha, hora_inicio, duracion_min, estado, creado_por)
  SELECT m.id, a.id, s.fecha, s.hora_inicio, s.duracion_min, s.estado, u.id
  FROM src s
  JOIN materias m ON m.sigla = s.materia_sigla
  JOIN ambientes a ON a.nombre = s.ambiente_nombre
  JOIN usuarios u ON u.correo_electronico = s.docente_correo
  RETURNING id, materia_id, ambiente_id, fecha, estado
)
SELECT * FROM ins;

-- ---------------------------------------------------------------------
-- 11. NORMAS DE EXAMEN (2 normas generales por examen)
-- ---------------------------------------------------------------------
INSERT INTO normas_examen (examen_id, tipo, descripcion)
SELECT ei.id, 'general', n.descripcion
FROM exam_ids ei
CROSS JOIN (VALUES
    ('Presentar carnet universitario y cedula de identidad vigente para el ingreso.'),
    ('Prohibido el uso de telefonos celulares, smartwatch o cualquier dispositivo electronico durante el examen.')
) AS n(descripcion);

-- Norma particular de ejemplo (tiempo adicional por certificado medico)
INSERT INTO normas_examen (examen_id, estudiante_id, tipo, descripcion)
SELECT ei.id, es.id, 'particular', 'Tiempo adicional de 15 minutos autorizado por certificado medico presentado a la carrera.'
FROM exam_ids ei
JOIN materias m ON m.id = ei.materia_id AND m.sigla = 'CIV102'
JOIN estudiantes es ON es.codigo_universitario = '202111346';

-- ---------------------------------------------------------------------
-- 12. HABILITACIONES (todo estudiante inscrito en la materia queda
--     habilitado por defecto para el examen; algunos se inhabilitan)
-- ---------------------------------------------------------------------
INSERT INTO habilitaciones (estudiante_id, examen_id, habilitado, motivo_id, observacion, registrado_por)
SELECT insc.estudiante_id, ex.id, TRUE, NULL, NULL, ex.creado_por
FROM examenes ex
JOIN inscripciones insc ON insc.materia_id = ex.materia_id AND insc.gestion = '2026-2'
WHERE ex.estado IN ('finalizado','en curso','programado')
ON CONFLICT (estudiante_id, examen_id) DO NOTHING;

UPDATE habilitaciones h
SET habilitado = FALSE,
    motivo_id = (SELECT id FROM motivos_inhabilitacion WHERE codigo = 'DOC_INCOMPLETA'),
    observacion = 'Pendiente de regularizar documentacion en la Direccion de Carrera.'
WHERE h.id IN (
    SELECT h2.id FROM habilitaciones h2
    JOIN examenes ex2 ON ex2.id = h2.examen_id
    WHERE ex2.estado = 'finalizado'
    ORDER BY h2.id
    LIMIT 5
);

UPDATE habilitaciones h
SET habilitado = FALSE,
    motivo_id = (SELECT id FROM motivos_inhabilitacion WHERE codigo = 'DEUDA_ECONOMICA'),
    observacion = 'Estudiante con deuda pendiente reportada por la DAF.'
WHERE h.id IN (
    SELECT h2.id FROM habilitaciones h2
    JOIN examenes ex2 ON ex2.id = h2.examen_id
    WHERE ex2.estado = 'finalizado'
    ORDER BY h2.id DESC
    LIMIT 3
);

-- ---------------------------------------------------------------------
-- 13. INGRESOS (para examenes finalizados, estudiantes habilitados)
-- ---------------------------------------------------------------------
INSERT INTO ingresos (habilitacion_id, ambiente_id, metodo_verificacion_id, fecha_hora_ingreso, ambiente_correcto, usuario_id)
SELECT
    h.id,
    ex.ambiente_id,
    (SELECT id FROM metodos_verificacion ORDER BY id LIMIT 1 OFFSET (h.id % 3)),
    (ex.fecha + ex.hora_inicio + ((h.id % 10) || ' minutes')::interval),
    CASE WHEN h.id % 17 = 0 THEN FALSE ELSE TRUE END,
    (SELECT id FROM usuarios WHERE correo_electronico = 'erika.gonzales@kairos.umss.edu')
FROM habilitaciones h
JOIN examenes ex ON ex.id = h.examen_id
WHERE h.habilitado = TRUE AND ex.estado = 'finalizado' AND h.id % 5 <> 0;

-- ---------------------------------------------------------------------
-- 14. DETALLES DE INGRESO (informacion adicional de ejemplo)
-- ---------------------------------------------------------------------
INSERT INTO detalles_ingreso (ingreso_id, campo, valor)
SELECT id, 'observacion_ingreso', 'Ingreso registrado sin novedad.'
FROM ingresos ORDER BY id LIMIT 8;

-- ---------------------------------------------------------------------
-- 15. EXPULSIONES (casos de ejemplo)
-- ---------------------------------------------------------------------
INSERT INTO expulsiones (ingreso_id, motivo, usuario_id)
SELECT id, 'Fue sorprendido consultando apuntes no autorizados durante el desarrollo del examen.',
    (SELECT id FROM usuarios WHERE correo_electronico = 'freddy.vera@kairos.umss.edu')
FROM ingresos WHERE id % 11 = 0 LIMIT 3;

-- ---------------------------------------------------------------------
-- 16. INTENTOS DE INGRESO RECHAZADOS
-- ---------------------------------------------------------------------
INSERT INTO intentos_ingreso (examen_id, estudiante_id, codigo_ingresado, motivo_rechazo, usuario_id)
SELECT h.examen_id, h.estudiante_id, e.codigo_universitario, 'no habilitado',
    (SELECT id FROM usuarios WHERE correo_electronico = 'rosario.camacho@kairos.umss.edu')
FROM habilitaciones h
JOIN estudiantes e ON e.id = h.estudiante_id
JOIN examenes ex ON ex.id = h.examen_id
WHERE h.habilitado = FALSE AND ex.estado = 'finalizado';

INSERT INTO intentos_ingreso (examen_id, estudiante_id, codigo_ingresado, motivo_rechazo, usuario_id)
SELECT ex.id, NULL, '209987654', 'no encontrado',
    (SELECT id FROM usuarios WHERE correo_electronico = 'freddy.vera@kairos.umss.edu')
FROM examenes ex WHERE ex.estado = 'finalizado' ORDER BY ex.id LIMIT 2;

INSERT INTO intentos_ingreso (examen_id, estudiante_id, codigo_ingresado, motivo_rechazo, usuario_id)
SELECT h.examen_id, h.estudiante_id, e.codigo_universitario, 'ingreso duplicado',
    (SELECT id FROM usuarios WHERE correo_electronico = 'erika.gonzales@kairos.umss.edu')
FROM habilitaciones h
JOIN estudiantes e ON e.id = h.estudiante_id
JOIN examenes ex ON ex.id = h.examen_id
JOIN ingresos ing ON ing.habilitacion_id = h.id
WHERE ex.estado = 'finalizado'
ORDER BY h.id LIMIT 2;

-- ---------------------------------------------------------------------
-- 17. INCIDENCIAS
-- ---------------------------------------------------------------------
INSERT INTO incidencias (examen_id, estudiante_id, tipo_incidencia_id, descripcion, usuario_id)
SELECT h.examen_id, h.estudiante_id,
    (SELECT id FROM tipos_incidencia ORDER BY id LIMIT 1 OFFSET (h.id % 5)),
    'Incidencia registrada por el personal de control durante el examen.',
    (SELECT id FROM usuarios WHERE correo_electronico = 'erika.gonzales@kairos.umss.edu')
FROM habilitaciones h
JOIN examenes ex ON ex.id = h.examen_id
WHERE ex.estado = 'finalizado' AND h.id % 13 = 0;

-- ---------------------------------------------------------------------
-- 18. HISTORIAL DE OPERACIONES (auditoria de ejemplo)
-- ---------------------------------------------------------------------
INSERT INTO historial_operaciones (usuario_id, accion, entidad, entidad_id, datos_nuevos, direccion_ip)
SELECT ex.creado_por, 'crear_examen', 'examenes', ex.id,
    jsonb_build_object('materia', m.nombre, 'fecha', ex.fecha, 'estado', ex.estado),
    '192.168.1.45'
FROM examenes ex JOIN materias m ON m.id = ex.materia_id
ORDER BY ex.id LIMIT 6;

INSERT INTO historial_operaciones (usuario_id, accion, entidad, entidad_id, datos_nuevos, direccion_ip)
SELECT (SELECT id FROM usuarios WHERE correo_electronico = 'direccion.fcyt@umss.edu'),
    'crear_usuario', 'usuarios', id,
    jsonb_build_object('correo', correo_electronico, 'rol_id', rol_id),
    '192.168.1.10'
FROM usuarios ORDER BY id LIMIT 4;

-- ---------------------------------------------------------------------
-- 19. RESPALDOS (historial de backups de ejemplo)
-- ---------------------------------------------------------------------
INSERT INTO respaldos (usuario_id, nombre_archivo, ruta, tamano_bytes, estado) VALUES
    ((SELECT id FROM usuarios WHERE correo_electronico = 'direccion.fcyt@umss.edu'), 'kairos_db_backup_2026-09-15.sql', '/backups/kairos_db_backup_2026-09-15.sql', 15728640, 'completado'),
    ((SELECT id FROM usuarios WHERE correo_electronico = 'direccion.fcyt@umss.edu'), 'kairos_db_backup_2026-09-08.sql', '/backups/kairos_db_backup_2026-09-08.sql', 15400320, 'completado'),
    ((SELECT id FROM usuarios WHERE correo_electronico = 'direccion.fcyt@umss.edu'), 'kairos_db_backup_2026-09-01.sql', '/backups/kairos_db_backup_2026-09-01.sql', 0, 'fallido');

COMMIT;

-- ---------------------------------------------------------------------
-- Resumen final
-- ---------------------------------------------------------------------
SELECT 'roles' AS tabla, COUNT(*) FROM roles
UNION ALL SELECT 'permisos', COUNT(*) FROM permisos
UNION ALL SELECT 'usuarios', COUNT(*) FROM usuarios
UNION ALL SELECT 'carreras', COUNT(*) FROM carreras
UNION ALL SELECT 'estudiantes', COUNT(*) FROM estudiantes
UNION ALL SELECT 'materias', COUNT(*) FROM materias
UNION ALL SELECT 'inscripciones', COUNT(*) FROM inscripciones
UNION ALL SELECT 'ambientes', COUNT(*) FROM ambientes
UNION ALL SELECT 'examenes', COUNT(*) FROM examenes
UNION ALL SELECT 'normas_examen', COUNT(*) FROM normas_examen
UNION ALL SELECT 'motivos_inhabilitacion', COUNT(*) FROM motivos_inhabilitacion
UNION ALL SELECT 'habilitaciones', COUNT(*) FROM habilitaciones
UNION ALL SELECT 'metodos_verificacion', COUNT(*) FROM metodos_verificacion
UNION ALL SELECT 'ingresos', COUNT(*) FROM ingresos
UNION ALL SELECT 'detalles_ingreso', COUNT(*) FROM detalles_ingreso
UNION ALL SELECT 'expulsiones', COUNT(*) FROM expulsiones
UNION ALL SELECT 'tipos_incidencia', COUNT(*) FROM tipos_incidencia
UNION ALL SELECT 'intentos_ingreso', COUNT(*) FROM intentos_ingreso
UNION ALL SELECT 'incidencias', COUNT(*) FROM incidencias
UNION ALL SELECT 'historial_operaciones', COUNT(*) FROM historial_operaciones
UNION ALL SELECT 'respaldos', COUNT(*) FROM respaldos
ORDER BY 1;
