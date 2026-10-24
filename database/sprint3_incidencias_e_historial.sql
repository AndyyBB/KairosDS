-- Sprint 3 (HU-24, HU-25, HU-27): migracion 2026_10_24_000001_sprint3_incidencias_e_historial.
-- Equivale a "php artisan migrate". Ejecutar una sola vez en kairos_db.
BEGIN;

ALTER TABLE historial_operaciones
    ADD COLUMN IF NOT EXISTS usuario_nombre VARCHAR(150),
    ADD COLUMN IF NOT EXISTS usuario_rol VARCHAR(50),
    ADD COLUMN IF NOT EXISTS modulo VARCHAR(50),
    ADD COLUMN IF NOT EXISTS detalle TEXT;

DO $$
DECLARE r record;
BEGIN
    FOR r IN
        SELECT c.conname FROM pg_constraint c
        JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey)
        WHERE c.conrelid = 'historial_operaciones'::regclass AND c.contype = 'f' AND a.attname = 'usuario_id'
    LOOP
        EXECUTE format('ALTER TABLE historial_operaciones DROP CONSTRAINT %I', r.conname);
    END LOOP;
END $$;
ALTER TABLE historial_operaciones ALTER COLUMN usuario_id DROP NOT NULL;
ALTER TABLE historial_operaciones ADD CONSTRAINT historial_operaciones_usuario_id_foreign
    FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE SET NULL;
UPDATE historial_operaciones h
SET usuario_nombre = u.nombre_completo, usuario_rol = r.nombre
FROM usuarios u LEFT JOIN roles r ON r.id = u.rol_id
WHERE u.id = h.usuario_id AND h.usuario_nombre IS NULL;
-- Registros anteriores: modulo, accion y detalle legibles.
UPDATE historial_operaciones SET modulo = CASE entidad
        WHEN 'examenes' THEN 'Exámenes' WHEN 'usuarios' THEN 'Usuarios' WHEN 'estudiantes' THEN 'Estudiantes'
        WHEN 'ambientes' THEN 'Ambientes' WHEN 'habilitaciones' THEN 'Habilitaciones' WHEN 'ingresos' THEN 'Control de ingreso'
        ELSE initcap(entidad) END
WHERE modulo IS NULL;
UPDATE historial_operaciones SET accion = CASE
        WHEN accion ILIKE 'crear%' OR accion ILIKE 'registrar%' THEN 'Registrar'
        WHEN accion ILIKE 'editar%' OR accion ILIKE 'actualizar%' THEN 'Editar'
        WHEN accion ILIKE 'eliminar%' THEN 'Eliminar'
        ELSE accion END
WHERE detalle IS NULL;
UPDATE historial_operaciones SET detalle = 'Examen de ' || (datos_nuevos->>'materia')
        || CASE WHEN datos_nuevos->>'fecha' ~ '^\d{4}-\d{2}-\d{2}' THEN ' del ' || to_char((datos_nuevos->>'fecha')::date, 'DD/MM/YYYY') ELSE '' END
WHERE detalle IS NULL AND entidad = 'examenes' AND datos_nuevos ? 'materia';
UPDATE historial_operaciones SET detalle = 'Usuario ' || (datos_nuevos->>'correo')
WHERE detalle IS NULL AND entidad = 'usuarios' AND datos_nuevos ? 'correo';

ALTER TABLE incidencias ADD COLUMN IF NOT EXISTS ambiente_destino_id BIGINT
    REFERENCES ambientes (id) ON DELETE SET NULL;

INSERT INTO tipos_incidencia (codigo, descripcion) VALUES
    ('IDENTIFICACION', 'Problema de identificación'),
    ('CAMBIO_AMBIENTE', 'Cambio de ambiente'),
    ('NO_HABILITADO', 'Estudiante no habilitado'),
    ('PROBLEMA_SALUD', 'Malestar o emergencia de salud'),
    ('OTRA', 'Otra situación')
ON CONFLICT (codigo) DO UPDATE SET descripcion = EXCLUDED.descripcion, updated_at = NOW();

INSERT INTO migrations (migration, batch)
SELECT '2026_10_24_000001_sprint3_incidencias_e_historial', COALESCE(MAX(batch), 0) + 1 FROM migrations
WHERE NOT EXISTS (SELECT 1 FROM migrations WHERE migration = '2026_10_24_000001_sprint3_incidencias_e_historial');

COMMIT;
