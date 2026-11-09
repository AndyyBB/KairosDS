<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

// Sprint 4 (observaciones 8, 19 y 20 de la licenciada):
// - Un estudiante no puede estar rindiendo dos examenes a la vez. Si sale de un examen para
//   entrar a otro, se registra su SALIDA (fecha y hora, observacion obligatoria y usuario) y el
//   nuevo ingreso queda con esa observacion.
// - Los ingresos ya no se editan ni se eliminan: se quitan los permisos "Editar" y "Eliminar"
//   de Control de ingreso de los roles (el administrador tampoco los usa).
return new class extends Migration
{
    public function up(): void
    {
        DB::statement('ALTER TABLE ingresos ADD COLUMN IF NOT EXISTS fecha_hora_salida timestamp NULL');
        DB::statement('ALTER TABLE ingresos ADD COLUMN IF NOT EXISTS observacion_salida varchar(300) NULL');
        DB::statement('ALTER TABLE ingresos ADD COLUMN IF NOT EXISTS salida_registrada_por bigint NULL REFERENCES usuarios(id) ON DELETE SET NULL');
        DB::statement('ALTER TABLE ingresos ADD COLUMN IF NOT EXISTS observacion varchar(300) NULL');

        DB::statement("DELETE FROM rol_permiso WHERE permiso_id IN (
            SELECT id FROM permisos WHERE codigo IN ('control_ingreso.editar', 'control_ingreso.eliminar')
        )");
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE ingresos DROP COLUMN IF EXISTS observacion');
        DB::statement('ALTER TABLE ingresos DROP COLUMN IF EXISTS salida_registrada_por');
        DB::statement('ALTER TABLE ingresos DROP COLUMN IF EXISTS observacion_salida');
        DB::statement('ALTER TABLE ingresos DROP COLUMN IF EXISTS fecha_hora_salida');
    }
};
