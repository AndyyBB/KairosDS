<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

// HU-04 (simplificacion): el mockup oficial pide un campo de texto libre
// "Motivo de inhabilitacion" (columna `observacion`, max 200 caracteres) en
// lugar de obligar a elegir un motivo del catalogo. El catalogo se mantiene
// disponible para otros usos, pero deja de ser obligatorio al inhabilitar.
//
// Nota: el esquema original (creado directamente por SQL antes de que
// existieran migraciones de Laravel) tenia DOS constraints CHECK distintos
// con la misma regla vieja: uno con nombre generado por Postgres
// ("habilitaciones_check") y otro con nombre explicito
// ("chk_habilitaciones_motivo"). Hay que tumbar ambos.
return new class extends Migration
{
    public function up(): void
    {
        DB::statement('ALTER TABLE habilitaciones DROP CONSTRAINT IF EXISTS chk_habilitaciones_motivo');
        DB::statement('ALTER TABLE habilitaciones DROP CONSTRAINT IF EXISTS habilitaciones_check');
        DB::statement('ALTER TABLE habilitaciones ADD CONSTRAINT chk_habilitaciones_motivo CHECK (habilitado = TRUE OR observacion IS NOT NULL)');
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE habilitaciones DROP CONSTRAINT IF EXISTS chk_habilitaciones_motivo');
        DB::statement('ALTER TABLE habilitaciones ADD CONSTRAINT chk_habilitaciones_motivo CHECK (habilitado = TRUE OR motivo_id IS NOT NULL)');
    }
};
