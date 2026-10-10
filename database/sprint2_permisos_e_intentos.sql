-- Sprint 2 (HU-17 y HU-26): permisos por modulo/accion y motivos de intentos de ingreso.
-- Ejecutar una sola vez en pgAdmin (Query Tool sobre kairos_db) si no se usa `php artisan migrate`.
BEGIN;
DELETE FROM rol_permiso;
DELETE FROM permisos;

INSERT INTO permisos (codigo, descripcion)
SELECT m.codigo || '.' || a.codigo, a.etiqueta || ' - ' || m.etiqueta
FROM (VALUES
    ('estudiantes', 'Estudiantes'),
    ('ambientes', 'Ambientes'),
    ('examenes', 'Examenes'),
    ('habilitaciones', 'Habilitaciones'),
    ('control_ingreso', 'Control de ingreso'),
    ('reportes', 'Reportes'),
    ('usuarios', 'Usuarios')
) AS m(codigo, etiqueta)
CROSS JOIN (VALUES
    ('ver', 'Ver'),
    ('registrar', 'Registrar'),
    ('editar', 'Editar'),
    ('eliminar', 'Eliminar')
) AS a(codigo, etiqueta);

INSERT INTO rol_permiso (rol_id, permiso_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permisos p
WHERE r.nombre = 'administrador';

INSERT INTO rol_permiso (rol_id, permiso_id)
SELECT r.id, p.id FROM roles r JOIN permisos p ON p.codigo IN (
    'estudiantes.ver', 'estudiantes.registrar', 'estudiantes.editar', 'estudiantes.eliminar',
    'ambientes.ver', 'ambientes.registrar', 'ambientes.editar', 'ambientes.eliminar',
    'examenes.ver', 'examenes.registrar', 'examenes.editar', 'examenes.eliminar',
    'habilitaciones.ver', 'habilitaciones.registrar', 'habilitaciones.editar',
    'control_ingreso.ver', 'reportes.ver'
)
WHERE r.nombre = 'docente';

INSERT INTO rol_permiso (rol_id, permiso_id)
SELECT r.id, p.id FROM roles r JOIN permisos p ON p.codigo IN (
    'estudiantes.ver', 'ambientes.ver', 'examenes.ver', 'habilitaciones.ver',
    'control_ingreso.ver', 'control_ingreso.registrar'
)
WHERE r.nombre = 'personal de control de ingreso';

ALTER TABLE intentos_ingreso DROP CONSTRAINT IF EXISTS chk_intentos_motivo;
ALTER TABLE intentos_ingreso DROP CONSTRAINT IF EXISTS intentos_ingreso_motivo_rechazo_check;

UPDATE intentos_ingreso SET motivo_rechazo = 'No habilitado' WHERE motivo_rechazo = 'no habilitado';
UPDATE intentos_ingreso SET motivo_rechazo = 'No inscrito en el examen' WHERE motivo_rechazo = 'no inscrito';
ALTER TABLE intentos_ingreso ADD CONSTRAINT chk_intentos_motivo
    CHECK (motivo_rechazo IN ('No habilitado', 'No inscrito en el examen', 'no encontrado', 'ingreso duplicado'));

CREATE INDEX IF NOT EXISTS idx_intentos_examen_fecha ON intentos_ingreso (examen_id, fecha_hora DESC);

CREATE OR REPLACE FUNCTION bloquear_cambios_intentos() RETURNS trigger AS $fn$
BEGIN
    RAISE EXCEPTION 'Los intentos registrados no se pueden modificar ni eliminar.';
END;
$fn$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_intentos_inmutables ON intentos_ingreso;
CREATE TRIGGER trg_intentos_inmutables
    BEFORE UPDATE OR DELETE ON intentos_ingreso
    FOR EACH ROW EXECUTE FUNCTION bloquear_cambios_intentos();
INSERT INTO migrations (migration, batch) VALUES ('2026_10_09_000001_sprint2_permisos_e_intentos', (SELECT COALESCE(MAX(batch),0)+1 FROM migrations));
COMMIT;
