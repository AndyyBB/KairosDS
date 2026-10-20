-- HU-17: "Ver" implicito (migracion 2026_10_20_000001)
BEGIN;

DELETE FROM rol_permiso rp
USING permisos p, roles r
WHERE rp.permiso_id = p.id
  AND rp.rol_id = r.id
  AND r.nombre <> 'administrador'
  AND p.codigo LIKE '%.ver'
  AND split_part(p.codigo, '.', 1) <> 'reportes'
  AND NOT EXISTS (
      SELECT 1
      FROM rol_permiso rp2
      JOIN permisos p2 ON p2.id = rp2.permiso_id
      WHERE rp2.rol_id = rp.rol_id
        AND split_part(p2.codigo, '.', 1) = split_part(p.codigo, '.', 1)
        AND split_part(p2.codigo, '.', 2) <> 'ver'
  );

INSERT INTO migrations (migration, batch)
SELECT '2026_10_20_000001_permisos_sin_ver_explicito', COALESCE(MAX(batch), 0) + 1 FROM migrations
WHERE NOT EXISTS (SELECT 1 FROM migrations WHERE migration = '2026_10_20_000001_permisos_sin_ver_explicito');

COMMIT;
