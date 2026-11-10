<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

// Sprint 4 (observaciones 11 y 12 de la licenciada):
// - Las carreras de un estudiante se guardan con su periodo de vigencia (fecha_inicio y
//   fecha_fin). Al quitar una carrera no se borra: se cierra con fecha_fin. Una carrera
//   vigente es la que tiene fecha_fin vacia. Asi queda el historial de las carreras.
// - La eliminacion de estudiantes es logica (activo = false): el estudiante deja de
//   aparecer, pero se conservan sus ingresos, intentos e incidencias.
return new class extends Migration
{
    public function up(): void
    {
        DB::statement('ALTER TABLE estudiante_carrera ADD COLUMN IF NOT EXISTS fecha_inicio date');
        DB::statement('ALTER TABLE estudiante_carrera ADD COLUMN IF NOT EXISTS fecha_fin date');
        DB::statement('UPDATE estudiante_carrera SET fecha_inicio = created_at::date WHERE fecha_inicio IS NULL');
        DB::statement('ALTER TABLE estudiante_carrera ALTER COLUMN fecha_inicio SET DEFAULT CURRENT_DATE');
        DB::statement('ALTER TABLE estudiante_carrera ALTER COLUMN fecha_inicio SET NOT NULL');

        // La llave (estudiante, carrera) ya no es unica: un estudiante puede volver a una
        // carrera que dejo antes. Solo puede haber UN periodo vigente por carrera.
        DB::statement('ALTER TABLE estudiante_carrera DROP CONSTRAINT IF EXISTS estudiante_carrera_pkey');
        DB::statement('ALTER TABLE estudiante_carrera ADD COLUMN IF NOT EXISTS id bigserial PRIMARY KEY');
        DB::statement('CREATE UNIQUE INDEX IF NOT EXISTS estudiante_carrera_vigente
            ON estudiante_carrera (estudiante_id, carrera_id) WHERE fecha_fin IS NULL');
        DB::statement('ALTER TABLE estudiante_carrera DROP CONSTRAINT IF EXISTS estudiante_carrera_periodo_valido');
        DB::statement('ALTER TABLE estudiante_carrera ADD CONSTRAINT estudiante_carrera_periodo_valido
            CHECK (fecha_fin IS NULL OR fecha_fin >= fecha_inicio)');
    }

    public function down(): void
    {
        DB::statement('DELETE FROM estudiante_carrera WHERE fecha_fin IS NOT NULL');
        DB::statement('ALTER TABLE estudiante_carrera DROP CONSTRAINT IF EXISTS estudiante_carrera_periodo_valido');
        DB::statement('DROP INDEX IF EXISTS estudiante_carrera_vigente');
        DB::statement('ALTER TABLE estudiante_carrera DROP CONSTRAINT IF EXISTS estudiante_carrera_pkey');
        DB::statement('ALTER TABLE estudiante_carrera DROP COLUMN IF EXISTS id');
        DB::statement('ALTER TABLE estudiante_carrera ADD PRIMARY KEY (estudiante_id, carrera_id)');
        DB::statement('ALTER TABLE estudiante_carrera DROP COLUMN IF EXISTS fecha_fin');
        DB::statement('ALTER TABLE estudiante_carrera DROP COLUMN IF EXISTS fecha_inicio');
    }
};
