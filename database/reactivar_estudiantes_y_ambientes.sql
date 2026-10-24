-- Reactiva los estudiantes y ambientes desactivados con la version anterior (migracion 2026_10_23_000001).
-- Desde ahora no se desactivan: se eliminan definitivamente desde "Eliminar estudiante" y "Eliminar ambiente".
BEGIN;

UPDATE estudiantes SET activo = TRUE, updated_at = NOW() WHERE activo = FALSE;
UPDATE ambientes SET activo = TRUE, updated_at = NOW() WHERE activo = FALSE;

INSERT INTO migrations (migration, batch)
SELECT '2026_10_23_000001_reactivar_estudiantes_y_ambientes', COALESCE(MAX(batch), 0) + 1 FROM migrations
WHERE NOT EXISTS (SELECT 1 FROM migrations WHERE migration = '2026_10_23_000001_reactivar_estudiantes_y_ambientes');

COMMIT;
