-- Eliminacion definitiva: los intentos se borran solo junto con su examen/estudiante (migracion 2026_10_20_000002)
BEGIN;

CREATE OR REPLACE FUNCTION bloquear_cambios_intentos() RETURNS trigger AS $fn$
BEGIN
    IF TG_OP = 'DELETE' AND current_setting('kairos.borrado_definitivo', true) = 'on' THEN
        RETURN OLD;
    END IF;
    RAISE EXCEPTION 'Los intentos registrados no se pueden modificar ni eliminar.';
END;
$fn$ LANGUAGE plpgsql;

INSERT INTO migrations (migration, batch)
SELECT '2026_10_20_000002_borrado_definitivo_intentos', COALESCE(MAX(batch), 0) + 1 FROM migrations
WHERE NOT EXISTS (SELECT 1 FROM migrations WHERE migration = '2026_10_20_000002_borrado_definitivo_intentos');

COMMIT;
