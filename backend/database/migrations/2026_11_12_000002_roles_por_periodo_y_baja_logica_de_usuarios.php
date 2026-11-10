<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

// Sprint 4 (observaciones 17 y 18 de la licenciada), usuarios:
// - Edicion limitada: el rol de un usuario se guarda por periodos (desde / hasta, quien lo
//   asigno), igual que las carreras de los estudiantes y los permisos de los roles.
// - Eliminacion logica: el usuario no se borra de la base de datos. Queda marcado como
//   eliminado (eliminado_en / eliminado_por) y NO ACTIVO, y se conserva todo lo que registro.
return new class extends Migration
{
    public function up(): void
    {
        DB::statement('ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS eliminado_en timestamp NULL');
        DB::statement('ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS eliminado_por bigint NULL REFERENCES usuarios(id) ON DELETE SET NULL');

        DB::statement('CREATE TABLE IF NOT EXISTS usuario_rol_vigencia (
            id bigserial PRIMARY KEY,
            usuario_id bigint NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
            rol_id bigint NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
            vigente_desde timestamp NOT NULL DEFAULT (now() AT TIME ZONE \'UTC\'),
            vigente_hasta timestamp NULL,
            asignado_por bigint NULL REFERENCES usuarios(id) ON DELETE SET NULL,
            created_at timestamp NOT NULL DEFAULT (now() AT TIME ZONE \'UTC\'),
            CONSTRAINT usuario_rol_vigencia_periodo CHECK (vigente_hasta IS NULL OR vigente_hasta >= vigente_desde)
        )');
        // Un usuario tiene un solo rol vigente a la vez.
        DB::statement('CREATE UNIQUE INDEX IF NOT EXISTS usuario_rol_vigencia_abierta
            ON usuario_rol_vigencia (usuario_id) WHERE vigente_hasta IS NULL');

        // El rol actual de cada usuario queda vigente desde que se creo su cuenta.
        DB::statement('INSERT INTO usuario_rol_vigencia (usuario_id, rol_id, vigente_desde)
            SELECT u.id, u.rol_id, u.created_at FROM usuarios u
            WHERE NOT EXISTS (SELECT 1 FROM usuario_rol_vigencia v WHERE v.usuario_id = u.id)');
    }

    public function down(): void
    {
        DB::statement('DROP TABLE IF EXISTS usuario_rol_vigencia');
        DB::statement('ALTER TABLE usuarios DROP COLUMN IF EXISTS eliminado_por');
        DB::statement('ALTER TABLE usuarios DROP COLUMN IF EXISTS eliminado_en');
    }
};
