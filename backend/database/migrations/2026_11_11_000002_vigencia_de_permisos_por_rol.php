<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

// Sprint 4 (observacion 10 de la licenciada): los privilegios de cada rol se guardan por
// periodos de tiempo, para las auditorias. Cada fila dice desde cuando y hasta cuando un
// rol tuvo un permiso, y quien se lo asigno o se lo quito.
// La tabla rol_permiso sigue guardando los permisos ACTUALES (la usa el resto del sistema);
// rol_permiso_vigencia guarda el historial completo.
return new class extends Migration
{
    public function up(): void
    {
        DB::statement('CREATE TABLE IF NOT EXISTS rol_permiso_vigencia (
            id bigserial PRIMARY KEY,
            rol_id bigint NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
            permiso_id bigint NOT NULL REFERENCES permisos(id) ON DELETE CASCADE,
            vigente_desde timestamp NOT NULL DEFAULT (now() AT TIME ZONE \'UTC\'),
            vigente_hasta timestamp NULL,
            asignado_por bigint NULL REFERENCES usuarios(id) ON DELETE SET NULL,
            retirado_por bigint NULL REFERENCES usuarios(id) ON DELETE SET NULL,
            created_at timestamp NOT NULL DEFAULT (now() AT TIME ZONE \'UTC\'),
            CONSTRAINT rol_permiso_vigencia_periodo CHECK (vigente_hasta IS NULL OR vigente_hasta >= vigente_desde)
        )');
        // Un rol solo puede tener un periodo abierto por permiso.
        DB::statement('CREATE UNIQUE INDEX IF NOT EXISTS rol_permiso_vigencia_abierta
            ON rol_permiso_vigencia (rol_id, permiso_id) WHERE vigente_hasta IS NULL');
        DB::statement('CREATE INDEX IF NOT EXISTS rol_permiso_vigencia_rol ON rol_permiso_vigencia (rol_id, vigente_desde)');

        // Los permisos que cada rol tiene hoy quedan vigentes desde ahora. Las fechas se
        // guardan en UTC, igual que el resto de fechas que guarda Laravel (APP_TIMEZONE=UTC).
        DB::statement('INSERT INTO rol_permiso_vigencia (rol_id, permiso_id, vigente_desde)
            SELECT rp.rol_id, rp.permiso_id, (now() AT TIME ZONE \'UTC\') FROM rol_permiso rp
            WHERE NOT EXISTS (
                SELECT 1 FROM rol_permiso_vigencia v
                WHERE v.rol_id = rp.rol_id AND v.permiso_id = rp.permiso_id AND v.vigente_hasta IS NULL
            )');
    }

    public function down(): void
    {
        DB::statement('DROP TABLE IF EXISTS rol_permiso_vigencia');
    }
};
