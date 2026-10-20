<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

// HU-17: la columna "Ver" deja de configurarse en Roles y permisos; "ver" queda
// implicito al tener Registrar, Editar o Eliminar en el modulo. Se quitan los
// permisos "solo ver" que ya no se pueden ver ni cambiar en la tabla (excepto
// Reportes, que aun no tiene pantallas). El administrador no se modifica.
return new class extends Migration
{
    public function up(): void
    {
        DB::unprepared(<<<'SQL'
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
SQL);
    }

    public function down(): void
    {
        // Los permisos "solo ver" eliminados no se restauran automaticamente.
    }
};
